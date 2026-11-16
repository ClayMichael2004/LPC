# Little Polo Cafe (LPC) API Specification

> **Base URL:** `http://localhost:8080/api/v1`  
> **WebSocket URL:** `ws://localhost:8080/ws`  
> **All JSON payloads adhere strictly to `camelCase` and timestamps format in EAT (`+03:00`).**

---

## 1. Authentication & Profile

### 1.1 Customer Registration
- **Method:** `POST`
- **Path:** `/api/v1/auth/register`
- **Rate Limit:** 120 requests / minute
- **Description:** Registers a new customer account, hashes the password using bcrypt, stores the profile in PostgreSQL, and dispatches a welcome email with the Little Polo Cafe logo embedded via data URI.
- **Request Body:**
```json
{
  "name": "Michael Clay",
  "email": "michaelclay2225@gmail.com",
  "phone": "+254712345678",
  "password": "Password123!"
}
```
- **Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "message": "Registration successful! A welcome email with the Little Polo Cafe logo has been sent to your email address.",
    "user": {
      "id": "e45f94cf-6997-40b9-8588-4f05ba86d267",
      "name": "Michael Clay",
      "initials": "MC",
      "phone": "+254712345678",
      "email": "michaelclay2225@gmail.com",
      "role": "customer",
      "createdAt": "2026-11-16T22:31:27+03:00",
      "updatedAt": "2026-11-16T22:31:27+03:00"
    }
  }
}
```
- **Conflict Error (`409 Conflict`):**
```json
{
  "success": false,
  "error": "an account with this email or phone already exists"
}
```

---

### 1.2 Customer Password Sign In
- **Method:** `POST`
- **Path:** `/api/v1/auth/login`
- **Rate Limit:** 120 requests / minute
- **Description:** Authenticates a registered customer using email or phone with their chosen password, returning a 7-day JWT Bearer token.
- **Request Body:**
```json
{
  "identifier": "michaelclay2225@gmail.com",
  "password": "Password123!"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 1732450000,
    "user": {
      "id": "e45f94cf-6997-40b9-8588-4f05ba86d267",
      "name": "Michael Clay",
      "initials": "MC",
      "phone": "+254712345678",
      "email": "michaelclay2225@gmail.com",
      "role": "customer",
      "createdAt": "2026-11-16T22:31:27+03:00",
      "updatedAt": "2026-11-16T22:31:27+03:00"
    }
  }
}
```

---

### 1.3 Request OTP Code
- **Method:** `POST`
- **Path:** `/api/v1/auth/otp/request`
- **Rate Limit:** 5 requests / minute
- **Request Body:**
```json
{
  "type": "phone",
  "identifier": "+254712345678"
}
```
*Or with email:*
```json
{
  "type": "email",
  "identifier": "mikewillmakeit2004@gmail.com"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "message": "Verification code sent successfully",
    "identifier": "+254712345678",
    "type": "phone",
    "devCode": "123456"
  }
}
```

---

### 1.2 Verify OTP Code & Sign In
- **Method:** `POST`
- **Path:** `/api/v1/auth/otp/verify`
- **Request Body:**
```json
{
  "identifier": "+254712345678",
  "code": "123456",
  "name": "Michael Clay"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 1732450000,
    "user": {
      "id": "usr-1",
      "name": "Michael Clay",
      "initials": "MC",
      "phone": "+254 712 345 678",
      "email": "michaelclay2225@gmail.com",
      "role": "customer",
      "dob": "15/06/1998",
      "createdAt": "2026-11-16T21:00:00+03:00",
      "updatedAt": "2026-11-16T21:00:00+03:00"
    }
  }
}
```

---

### 1.3 Administrator Login
- **Method:** `POST`
- **Path:** `/api/v1/auth/admin/login`
- **Request Body:**
```json
{
  "email": "mikewillmakeit2004@gmail.com",
  "password": "AdminLPC2026!"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 1732450000,
    "user": {
      "id": "usr-admin",
      "name": "Little Polo Cafe Owner",
      "role": "admin",
      "email": "mikewillmakeit2004@gmail.com"
    }
  }
}
```

---

### 1.4 Get Profile
- **Method:** `GET`
- **Path:** `/api/v1/profile`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response (`200 OK`):** Returns authenticated user profile.

---

### 1.5 Update Profile
- **Method:** `PUT`
- **Path:** `/api/v1/profile`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Request Body:**
```json
{
  "name": "Michael Clay",
  "phone": "+254 712 345 678",
  "email": "michaelclay2225@gmail.com",
  "dob": "15/06/1998"
}
```

---

## 2. Menu & Catalog (Redis-Cached)

### 2.1 Get Full Menu
- **Method:** `GET`
- **Path:** `/api/v1/menu`
- **Performance:** Served from Redis cache in <5ms.
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "categories": [
      { "id": "burgers", "name": "Polo Burgers", "image": "cat-grid-1.png", "displayOrder": 1 },
      { "id": "artisan-coffee", "name": "Artisan Coffee", "image": "cold-brew.jpg", "displayOrder": 2 }
    ],
    "products": [
      {
        "id": "big-boss-burger",
        "name": "Big Boss Burger",
        "category": "burgers",
        "price": 850.00,
        "description": "Double grilled patties with melted cheese...",
        "image": "burger-boss.png",
        "hasOptions": true,
        "isAvailable": true,
        "stockQuantity": 50,
        "optionsGroup": {
          "id": "burger-sauce",
          "title": "Choose Your Sauce",
          "required": true,
          "min": 1,
          "max": 1,
          "options": [
            { "id": "smoky-bbq", "name": "Smoky BBQ Sauce", "extraPrice": 0.00 },
            { "id": "spicy-mayo", "name": "Spicy Chili Mayo", "extraPrice": 20.00 }
          ]
        }
      }
    ]
  }
}
```

---

### 2.2 Get Promo Banners
- **Method:** `GET`
- **Path:** `/api/v1/menu/promos`

---

## 3. Server-Side Pricing & Orders

### 3.1 Calculate Prices (Server-Side)
- **Method:** `POST`
- **Path:** `/api/v1/orders/calculate`
- **Request Body:**
```json
{
  "items": [
    { "productId": "big-boss-burger", "optionId": "spicy-mayo", "quantity": 1 },
    { "productId": "cold-brew-vanilla", "optionId": "oat-milk", "quantity": 1 }
  ],
  "deliveryType": "delivery"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "subtotal": 1370.00,
    "deliveryFee": 150.00,
    "vat": 219.20,
    "total": 1520.00,
    "items": [
      {
        "productId": "big-boss-burger",
        "productName": "Big Boss Burger",
        "optionId": "spicy-mayo",
        "optionName": "Spicy Chili Mayo",
        "quantity": 1,
        "unitPrice": 850.00,
        "optionPrice": 20.00,
        "totalPrice": 870.00
      },
      {
        "productId": "cold-brew-vanilla",
        "productName": "Cold Brew Vanilla Sweet Cream",
        "optionId": "oat-milk",
        "optionName": "Oat Milk",
        "quantity": 1,
        "unitPrice": 450.00,
        "optionPrice": 50.00,
        "totalPrice": 500.00
      }
    ]
  }
}
```

---

### 3.2 Place Order (Atomic Transaction + Idempotency Key)
- **Method:** `POST`
- **Path:** `/api/v1/orders`
- **Headers:**
  - `Authorization: Bearer <CUSTOMER_TOKEN>`
  - `Idempotency-Key: <UUID>` *(Required for exact-once guarantee)*
- **Request Body:**
```json
{
  "items": [
    { "productId": "big-boss-burger", "optionId": "smoky-bbq", "quantity": 1 },
    { "productId": "2l-soda", "optionId": "coke-2l", "quantity": 1 }
  ],
  "deliveryInfo": {
    "addressName": "East Kisumu Villa",
    "landmark": "Near Mega Plaza",
    "estateBuilding": "Block B, Apt 4",
    "deliveryInstructions": "Leave at reception or call on arrival",
    "phone": "+254 712 345 678",
    "saveAddress": true
  },
  "paymentMethod": "mpesa"
}
```
- **Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "LPC-8924",
    "userId": "usr-1",
    "status": "PENDING",
    "subtotal": 1200.00,
    "deliveryFee": 150.00,
    "vat": 192.00,
    "total": 1350.00,
    "paymentMethod": "mpesa",
    "paymentStatus": "PENDING",
    "deliveryInfo": {
      "addressName": "East Kisumu Villa",
      "phone": "+254 712 345 678"
    },
    "estimatedDeliveryMinutes": 25,
    "createdAt": "2026-11-16T21:10:00+03:00",
    "updatedAt": "2026-11-16T21:10:00+03:00"
  }
}
```
- **Duplicate Request:** Returns identical payload with header `Idempotent-Replayed: true`.
- **Out of Stock (`409 Conflict`):**
```json
{
  "success": false,
  "error": "out of stock: product Nyama Nyama Burger (nyama-nyama-burger) requested 3 but only 1 available"
}
```

---

### 3.3 Get My Orders
- **Method:** `GET`
- **Path:** `/api/v1/orders/my-orders`
- **Headers:** `Authorization: Bearer <CUSTOMER_TOKEN>`

---

### 3.4 REST Fallback Live Order Tracking
- **Method:** `GET`
- **Path:** `/api/v1/orders/:id/tracking`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "orderId": "LPC-8924",
    "status": "OUT_FOR_DELIVERY",
    "statusStep": 4,
    "totalSteps": 5,
    "estimatedDeliveryMinutes": 25,
    "courier": {
      "name": "Kisumu Express Delivery Team",
      "phone": "+254 704 769 219",
      "location": {
        "lat": -0.0917,
        "lng": 34.7680
      }
    },
    "timeline": [
      { "status": "PENDING", "label": "Order Placed", "time": "2026-11-16T20:55:00+03:00", "completed": true },
      { "status": "CONFIRMED", "label": "Confirmed by Cafe", "time": "2026-11-16T20:57:00+03:00", "completed": true },
      { "status": "PREPARING", "label": "Kitchen Preparing", "time": "2026-11-16T21:00:00+03:00", "completed": true },
      { "status": "OUT_FOR_DELIVERY", "label": "Courier Dispatched", "time": "2026-11-16T21:10:00+03:00", "completed": true },
      { "status": "DELIVERED", "label": "Delivered", "time": null, "completed": false }
    ],
    "updatedAt": "2026-11-16T21:10:00+03:00"
  }
}
```

---

## 4. WebSockets (Live Real-Time Sync)

### 4.1 Customer Order Live Tracking WebSocket
- **Protocol:** `ws://` / `wss://`
- **URL:** `/ws/orders/:id`
- **Broadcast Messages:**
```json
{
  "type": "ORDER_UPDATE",
  "orderId": "LPC-8924",
  "payload": {
    "status": "OUT_FOR_DELIVERY",
    "statusStep": 4,
    "estimatedDeliveryMinutes": 20
  },
  "timestamp": "2026-11-16T21:12:00+03:00"
}
```
*Live Courier GPS stream:*
```json
{
  "type": "COURIER_LOCATION",
  "orderId": "LPC-8924",
  "payload": {
    "lat": -0.0924,
    "lng": 34.7692
  },
  "timestamp": "2026-11-16T21:12:05+03:00"
}
```

### 4.2 Cafe Owner Admin Live Feed WebSocket
- **URL:** `/ws/admin/orders`
- Receives instant broadcasts for every order placed across Kisumu.

---

## 5. Administrator Management (RBAC Admin Role Only)
> Requires `Authorization: Bearer <ADMIN_TOKEN>`

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/admin/orders` | `GET` | View all orders with optional `?status=` filter |
| `/api/v1/admin/orders/:id/status` | `PATCH` | Advance status (`CONFIRMED`, `PREPARING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`) |
| `/api/v1/admin/orders/:id/dispatch` | `POST` | Assign courier name, phone, ETA, and initial coordinates |
| `/api/v1/admin/orders/:id/location` | `POST` | Update live courier GPS lat/lng |
| `/api/v1/admin/menu/products/:id/stock` | `PATCH` | Toggle `isAvailable` and adjust `stockQuantity` (flushes Redis cache) |
| `/api/v1/admin/menu/products` | `POST` | Add new menu item |
| `/api/v1/admin/menu/products/:id` | `DELETE` | Remove menu item |
| `/api/v1/admin/stats` | `GET` | Sales revenue, pending counts, and operational KPIs |
