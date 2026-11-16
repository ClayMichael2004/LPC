# Little Polo Cafe (LPC) Backend Architecture & Concept Documentation

> **Production-grade Go Backend Architecture Reference**  
> **Location Context:** Little Polo Cafe, Kisumu, Kenya  
> **Timezone:** East Africa Time (EAT / UTC+03:00 / `Africa/Nairobi`)

---

## Table of Contents

1. [Project Overview & Domain Context](#1-project-overview--domain-context)
2. [Technology Stack & System Topology](#2-technology-stack--system-topology)
3. [Deep-Dive: Implementation of the 8 Core Concepts](#3-deep-dive-implementation-of-the-8-core-concepts)
   - [3.1 Server-Side Price Calculation](#31-server-side-price-calculation)
   - [3.2 Atomic Database Transactions](#32-atomic-database-transactions)
   - [3.3 Out-of-Stock Guards](#33-out-of-stock-guards)
   - [3.4 Idempotency Keys](#34-idempotency-keys)
   - [3.5 WebSocket + REST Fallback](#35-websocket--rest-fallback)
   - [3.6 Role-Based Access Control (RBAC)](#36-role-based-access-control-rbac)
   - [3.7 Redis Menu Caching](#37-redis-menu-caching)
   - [3.8 Standardized camelCase JSON & EAT Timestamps](#38-standardized-camelcase-json--eat-timestamps)
4. [Security, Rate Limiting & Error Recovery](#4-security-rate-limiting--error-recovery)
5. [Database Schema & Migration Engine](#5-database-schema--migration-engine)
6. [Automated Verification & Test Suite](#6-automated-verification--test-suite)

---

## 1. Project Overview & Domain Context

**Little Polo Cafe (LPC)** is an artisanal cafe and kitchen located in Kisumu, Kenya. The system serves customers who order cold brews, burgers, box meals, breakfast stacks, pastries, and sodas via their mobile application, as well as the cafe owner (administrator) who manages daily operations, menu availability, order fulfillment, and live courier dispatch.

---

## 2. Technology Stack & System Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Little Polo Cafe Client                         │
│                    (React Native / Expo Mobile App)                    │
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │ REST (camelCase JSON)          │ WebSocket (ws://)
                    ▼                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Gin Web Framework (Go HTTP Server)                  │
│  - Rate Limiter (Token Bucket)         - Idempotency Middleware        │
│  - Auth & RBAC Guard (JWT HS256)       - EAT Timezone Formatter        │
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │                                │
                    ▼                                ▼
       ┌────────────────────────┐       ┌────────────────────────┐
       │   Redis 7 (go-redis)   │       │  PostgreSQL 16+ (pgx)  │
       │ - Menu Cache (<5ms)    │       │ - ACID Transactions    │
       │ - Pub/Sub Hub          │       │ - Pessimistic Locks    │
       │ - Idempotency Keys     │       │ - Audit Timelines      │
       │ - OTP Codes (5m TTL)   │       │ - EAT Timestamp Store  │
       └────────────────────────┘       └────────────────────────┘
```

- **Backend Language:** Go (Golang 1.24+)
- **HTTP Engine:** Gin (`github.com/gin-gonic/gin`)
- **Primary Database:** PostgreSQL with `pgx/v5` connection pooling (`github.com/jackc/pgx/v5`)
- **Cache & Real-Time Sync:** Redis with `go-redis/v9` (`github.com/redis/go-redis/v9`)
- **Real-Time Communication:** Gorilla WebSockets (`github.com/gorilla/websocket`)
- **Authentication:** JWT HS256 (`github.com/golang-jwt/jwt/v5`) + Phone OTP / Email OTP (`mikewillmakeit2004@gmail.com`)

---

## 3. Deep-Dive: Implementation of the 8 Core Concepts

### 3.1 Server-Side Price Calculation
**Source Code:** `internal/service/pricing_service.go`

#### Problem Solved
Client applications can be tampered with or suffer from desynchronized cached prices. Allowing the frontend to submit unit prices, option surcharges, or order totals directly to the database introduces critical revenue loss and tampering vulnerabilities.

#### Implementation Architecture
1. The client sends **untrusted reference identifiers** only:
   ```json
   {
     "items": [
       { "productId": "big-boss-burger", "optionId": "spicy-mayo", "quantity": 2 },
       { "productId": "cold-brew-vanilla", "optionId": "oat-milk", "quantity": 1 }
     ],
     "deliveryType": "delivery"
   }
   ```
2. The `PricingService` resolves each product and option directly from authoritative storage.
3. Option groups are validated against the product's rules:
   - Verifies whether the option belongs to the product's active option group.
   - Enforces `required` option selection.
4. Mathematical formula executed server-side:
   $$\text{ItemUnitTotal} = \text{Product.Price} + \text{Option.ExtraPrice}$$
   $$\text{ItemTotal} = \text{ItemUnitTotal} \times \text{Quantity}$$
   $$\text{Subtotal} = \sum \text{ItemTotal}$$
   $$\text{DeliveryFee} = \begin{cases} 150.00 \text{ KES} & \text{if delivery} \\ 0.00 \text{ KES} & \text{if pickup} \end{cases}$$
   $$\text{VAT} = \text{round}(\text{Subtotal} \times 0.16)$$
   $$\text{Total} = \text{Subtotal} + \text{DeliveryFee}$$
5. Result is returned as an immutable `domain.PriceSummary` snapshot attached to the order.

---

### 3.2 Atomic Database Transactions
**Source Code:** `internal/repository/postgres/order_repo.go`

#### Problem Solved
Order creation involves multi-table inserts (`orders`, `order_items`, `order_tracking_steps`) and stock updates. A partial failure (e.g., connection drop between order insert and item insert) leads to orphaned records or inaccurate inventory counts.

#### Implementation Architecture
All order-related operations run inside an ACID transaction (`pgx.Tx`):

```go
tx, err := r.pool.Begin(ctx)
if err != nil {
    return fmt.Errorf("failed to begin transaction: %w", err)
}
defer tx.Rollback(ctx) // Automatically rolls back if an error occurs

// 1. Lock inventory rows with pessimistic locking (FOR UPDATE)
// 2. Validate stock quantity and availability
// 3. Decrement stock
// 4. Insert orders master record
// 5. Batch insert order_items child records
// 6. Insert initial order_tracking_steps record (PENDING)
// 7. Commit
if err := tx.Commit(ctx); err != nil {
    return fmt.Errorf("failed to commit order transaction: %w", err)
}
```

If any validation or insertion fails, `tx.Rollback(ctx)` reverts all changes completely.

---

### 3.3 Out-of-Stock Guards
**Source Code:** `internal/repository/postgres/order_repo.go` & `internal/service/order_service.go`

#### Problem Solved
In high-demand scenarios (e.g., Sunday lakefront brunch), multiple customers may attempt to order the last remaining burger or pancake stack simultaneously, causing negative inventory or order cancellations.

#### Implementation Architecture
1. **Row-Level Locking (`FOR UPDATE`):**
   ```sql
   SELECT name, is_available, stock_quantity
   FROM products
   WHERE id = $1
   FOR UPDATE;
   ```
   This serializes concurrent transactions on the exact items being ordered.
2. **Guards:**
   - If `!is_available`, transaction aborts with `UnavailableProductError`.
   - If `stock_quantity != -1` (limited item) and `stock_quantity < requested`, transaction aborts with `OutOfStockError{ ProductID, ProductName, Requested, Available }`.
3. **HTTP Status:** Handled by `order_handler.go` returning `HTTP 409 Conflict` with clear explanation.
4. **Admin Stock Controls:** Cafe owners can toggle `is_available` or alter `stock_quantity` via `PATCH /api/v1/admin/menu/products/:id/stock`, which immediately invalidates Redis caches.

---

### 3.4 Idempotency Keys
**Source Code:** `internal/middleware/idempotency.go` & `internal/repository/redis/idempotency_store.go`

#### Problem Solved
Mobile devices frequently drop network connections right after submitting a payment or placing an order. When the user taps "Pay" again or the app auto-retries, duplicate orders and charges must be prevented.

#### Implementation Architecture
- The mobile app provides a unique UUID header: `Idempotency-Key: e8a202d5-4541-4c7b-b8c1-19b02a9e3381`.
- **Atomic Lock Acquisition:**
  - Redis key: `lpc:idempotency:<key>` with 24-hour TTL.
  - Set via `SETNX` with payload `{"state": "PROCESSING"}`.
- **Decision Engine:**
  1. **New Request:** Lock acquired -> execution proceeds to handler -> upon HTTP 2xx response, payload is cached in Redis with `{"state": "COMPLETED", "statusCode": 201, "body": "..."}`.
  2. **In-Flight Duplicate:** Lock cannot be acquired, state is `"PROCESSING"` -> returns `HTTP 409 Conflict` ("A request with this Idempotency-Key is currently being processed").
  3. **Completed Duplicate (Replay):** State is `"COMPLETED"` -> middleware bypasses the handler entirely and returns the exact cached JSON response with header `Idempotent-Replayed: true`.
  4. **Failed Request (4xx/5xx):** The middleware releases the lock so the client can fix invalid parameters and retry.

---

### 3.5 WebSocket + REST Fallback
**Source Code:** `internal/transport/websocket/` & `internal/transport/http/order_handler.go`

#### Problem Solved
Customers expect live courier tracking with fluid animations. However, mobile websockets may be blocked by aggressive corporate proxies, cellular handoffs, or battery savers.

#### Implementation Architecture
- **Gorilla WebSocket (`/ws/orders/:id`):**
  - Upgrades connection with origin checking configured for mobile apps.
  - Maintains client write/read pumps, ping/pong heartbeats (every 54s), and message queues.
  - Subscribes to order-specific room.
  - **Multi-Instance Redis Pub/Sub:** Publishes to `lpc:events:orders` so multiple backend instances forward live courier movements seamlessly.
- **Gorilla WebSocket (`/ws/admin/orders`):**
  - Dedicated channel for the cafe owner dashboard receiving live order notifications and courier dispatches.
- **REST Fallback (`GET /api/v1/orders/:id/tracking`):**
  - Returns identical structured tracking steps, courier phone/name, and current GPS coordinates.
  - Mobile client polls this endpoint every 5-10s if the WebSocket drops.

---

### 3.6 Role-Based Access Control (RBAC)
**Source Code:** `internal/middleware/auth.go` & `internal/domain/user.go`

#### Problem Solved
Separates customer privileges from cafe management privileges, ensuring customers cannot access order queues, adjust item prices, or dispatch couriers.

#### Roles
1. `customer`: The mobile application user.
   - Place orders, view own order history, get live tracking, update own profile.
2. `admin`: The Little Polo Cafe owner.
   - View all incoming orders, advance order status, dispatch couriers, update inventory, manage pricing, view sales metrics.

#### Implementation Architecture
- JWT contains claims: `{ "sub": "usr-1", "role": "customer", "phone": "...", "email": "..." }`.
- `middleware.AuthMiddleware(jwtSecret)`: Verifies token validity and signature.
- `middleware.RequireRole("admin")`: Enforces RBAC checks. Returns `HTTP 403 Forbidden` if role does not match.

---

### 3.7 Redis Menu Caching
**Source Code:** `internal/repository/redis/menu_cache.go` & `internal/service/menu_service.go`

#### Problem Solved
Menu browsing is read-heavy. Querying PostgreSQL with complex joins (categories, products, option groups, options) on every mobile launch causes unnecessary database load.

#### Implementation Architecture
- **Cache-Aside Pattern:**
  1. `GET /api/v1/menu` checks Redis key `lpc:menu:all`.
  2. **Cache Hit (<5ms):** Deserializes cached JSON and returns immediately.
  3. **Cache Miss:** Queries PostgreSQL, bundles categories and products with options, writes to Redis with 1-hour TTL, and returns.
- **Cache Invalidation:**
  - When an Admin creates, updates, deletes, or changes stock of an item:
  - Calls `menuCache.InvalidateAll(ctx)` which issues `DEL lpc:menu:all lpc:menu:categories lpc:menu:products`.
  - Next customer request fetches fresh data from PostgreSQL and warms the cache.

---

### 3.8 Standardized camelCase JSON & EAT Timestamps
**Source Code:** `internal/domain/time.go` & all domain DTOs

#### Problem Solved
Frontend TypeScript conventions expect `camelCase` keys (`productId`, `deliveryFee`, `orderId`). Furthermore, standardizing timestamps to East Africa Time (UTC+03:00) avoids confusing timezone offsets for local deliveries in Kisumu.

#### Implementation Architecture
1. **camelCase JSON:**
   - Every Go struct field is explicitly tagged with `json:"camelCaseName"`.
   - Guaranteed consistency across all endpoints.
2. **EAT Timestamps:**
   - Custom `domain.EATTime` wraps `time.Time`.
   - Fixed timezone: `time.FixedZone("EAT", 3*60*60)` (+03:00 offset).
   - Formats to RFC3339: `"2026-11-16T21:08:04+03:00"`.
   - Implements `json.Marshaler`, `json.Unmarshaler`, `sql.Scanner`, and `driver.Valuer`.

---

## 4. Security, Rate Limiting & Error Recovery

1. **OTP Rate Limiting:**
   - `middleware.RateLimit(redisClient, 5, time.Minute)` on `/api/v1/auth/otp/request`.
   - Protects against SMS/Email spamming and brute-force attacks.
2. **API Rate Limiting:**
   - 120 requests/minute per client IP for general API routes.
3. **CORS:**
   - Configured for React Native / Expo development environments (`*` with support for `Idempotency-Key` and `Idempotent-Replayed` headers).
4. **Panic Recovery:**
   - `middleware.Recovery()` catches any unexpected runtime panic, logs the stack trace, and returns a safe HTTP 500 JSON envelope without leaking internal internals.

---

## 5. Database Schema & Migration Engine

The PostgreSQL schema is managed under `migrations/001_init_schema.up.sql` and auto-applied on server startup:

- `users`: Accounts, roles (`customer` | `admin`), phone, email, date of birth.
- `categories`: Menu sections (Burgers, Coffee, Desserts, etc.).
- `products`: Items, base prices, image names, availability flag, stock counts.
- `product_option_groups`: Customization groups (e.g. "Choose Your Sauce", "Milk Preference").
- `product_options`: Specific choices with extra prices.
- `orders`: Master order records, server-calculated totals, delivery info, courier details.
- `order_items`: Line item price snapshots.
- `order_tracking_steps`: Real-time status progression timeline.
- `activities`: Cafe events (e.g. Sunday Family Oil Painting).

---

## 6. Automated Verification & Test Suite

All components are protected by automated tests:
- `internal/domain`: `time_test.go` (EAT timestamp serialization and SQL scanning).
- `internal/middleware`: `auth_test.go` (RBAC role verification), `idempotency_test.go` (miniredis replay & conflict).
- `internal/repository/redis`: `menu_cache_test.go` (Cache-aside and invalidation).
- `internal/service`:
  - `pricing_service_test.go` (Server-side price calculation, VAT, delivery fees).
  - `auth_service_test.go` (Phone OTP, Email OTP to `mikewillmakeit2004@gmail.com`, admin login).
  - `order_service_test.go` (Atomic order placement, Out-of-Stock guard, courier tracking).
- `internal/transport/http`: `router_test.go` (End-to-end integration tests).

Run all tests:
```bash
cd backend
go test -v ./...
```
