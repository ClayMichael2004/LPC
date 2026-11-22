# Little Polo Cafe (LPC) - Go Backend

> **High-Performance Golang API Server, PostgreSQL 16+, Redis 7, & Gorilla WebSockets**  
> Serving Little Polo Cafe in Kisumu, Kenya (East Africa Time: UTC+3).

---

## Features Implemented

1. **Server-Side Price Calculation:** Full authoritative price, 16% VAT, and delivery fee calculation in `internal/service/pricing_service.go`.
2. **Atomic Database Transactions:** ACID guarantees with row-level pessimistic locks (`FOR UPDATE`) in `internal/repository/postgres/order_repo.go`.
3. **Out-of-Stock Guards:** Prevents ordering unavailable or depleted items; returns HTTP 409 Conflict.
4. **Idempotency Keys:** Exact-once order submission via `Idempotency-Key` header with Redis lock and replay.
5. **WebSocket + REST Fallback:** Real-time Gorilla WebSocket order tracking (`/ws/orders/:id`) with automatic REST polling fallback (`GET /api/v1/orders/:id/tracking`).
6. **Role-Based Access Control (RBAC):** Two roles (`customer` and `admin`) protected with JWT HS256 tokens and route guards.
7. **Redis Menu Caching:** Sub-5ms menu retrieval using the Cache-Aside pattern with automated invalidation upon menu updates.
8. **Standardized camelCase JSON & EAT Timestamps:** Strict camelCase DTOs and East Africa Time (`+03:00`, `Africa/Nairobi`) ISO 8601 formatting.
9. **OTP Authentication:** Phone OTP (mock SMS) & Email OTP sent via `mikewillmakeit2004@gmail.com`.
10. **Rate Limiting:** Token-bucket rate limiting on auth (5 req/min) and general APIs (120 req/min).

---

## Quickstart

### Prerequisites
- Go 1.24+
- PostgreSQL 15+ (or Docker)
- Redis 7+ (or Docker)

### 1. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Run with Docker Compose (Recommended)
```bash
docker-compose up -d --build
```

We also have a dockeer command to view logs that will be updated tomorrow, here
```

```

This spins up PostgreSQL, Redis, auto-migrates the database schema, seeds the initial Little Polo Cafe menu, and starts the API server on `http://localhost:8080`.

### 3. Run Locally (Without Docker)
```bash
# Seed initial categories, burgers, coffees, and admin user
go run cmd/seed/main.go

# Start the API server
go run cmd/server/main.go
```

---

## Running the Automated Test Suite

Every single package contains automated unit and integration tests:
```bash
# Run all tests
go test -v ./...
```

---

## Documentation Links

- [Architecture & 8 Concepts Deep-Dive](docs/ARCHITECTURE.md)
- [Complete API Specification](docs/API_SPEC.md)
- [Frontend Integration Guide](docs/FRONTEND_INTEGRATION.md)
