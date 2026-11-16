# Little Polo Cafe - Mobile Frontend Integration Guide

> **Zero-Breakage Frontend Integration Standard**  
> This guide outlines how to connect the existing React Native / Expo mobile app to the Go backend without modifying the frontend's visual design system.

---

## 1. Network Configuration

When running locally with Expo Go or native dev builds:
- **Android Emulator:** `http://10.0.2.2:8080/api/v1`
- **iOS Simulator:** `http://localhost:8080/api/v1`
- **Physical Device:** `http://<YOUR_LAN_IP>:8080/api/v1` (e.g. `http://192.168.1.150:8080/api/v1`)

---

## 2. Drop-In TypeScript API Client

Create `src/services/api.ts` in your frontend when ready:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export const API_BASE_URL = 'http://localhost:8080/api/v1';
export const WS_BASE_URL = 'ws://localhost:8080/ws';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { idempotencyKey?: string } = {}
): Promise<T> {
  const token = await AsyncStorage.getItem('@lpc_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Attach Idempotency-Key for POST/PUT mutating requests if requested
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || 'Something went wrong');
  }

  return json.data;
}
```

---

## 3. Server-Side Price Calculation Integration

Replace client-side estimation with authoritative server calculation:

```typescript
import { apiRequest } from '../services/api';

// In CartContext.tsx:
export async function fetchServerPricing(cartItems: CartItem[]) {
  const payload = {
    items: cartItems.map(item => ({
      productId: item.product.id,
      optionId: item.selectedOption?.id,
      quantity: item.quantity,
    })),
    deliveryType: 'delivery',
  };

  // Authoritative server-side calculation
  const summary = await apiRequest('/orders/calculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    subtotal: summary.subtotal,
    deliveryFee: summary.deliveryFee, // 150.00 KES
    vat: summary.vat,                 // 16% VAT
    total: summary.total,
  };
}
```

---

## 4. Atomic Order Placement with Idempotency Key

Prevent double charges during poor network connectivity in Kisumu:

```typescript
import * as Crypto from 'expo-crypto';
import { apiRequest } from '../services/api';

export async function placeOrder(cartItems: CartItem[], deliveryInfo: DeliveryInfo, paymentMethod: string) {
  // Generate unique idempotency key per checkout attempt
  const idempotencyKey = Crypto.randomUUID();

  const payload = {
    items: cartItems.map(i => ({
      productId: i.product.id,
      optionId: i.selectedOption?.id,
      quantity: i.quantity,
    })),
    deliveryInfo,
    paymentMethod,
  };

  const order = await apiRequest('/orders', {
    method: 'POST',
    idempotencyKey,
    body: JSON.stringify(payload),
  });

  return order; // e.g. { id: 'LPC-8924', status: 'PENDING', total: 1500 ... }
}
```

---

## 5. Live Tracking: WebSocket with REST Polling Fallback

Hook for `app/checkout/confirmation.tsx` and order tracking screen:

```typescript
import { useEffect, useState, useRef } from 'react';
import { WS_BASE_URL, apiRequest } from '../services/api';

export function useOrderTracking(orderId: string) {
  const [tracking, setTracking] = useState<any>(null);
  const [isWebSocketActive, setIsWebSocketActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    // 1. Fetch initial status via REST
    apiRequest(`/orders/${orderId}/tracking`)
      .then(setTracking)
      .catch(console.warn);

    // 2. Open Gorilla WebSocket connection
    const socket = new WebSocket(`${WS_BASE_URL}/orders/${orderId}`);
    wsRef.current = socket;

    socket.onopen = () => {
      setIsWebSocketActive(true);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ORDER_UPDATE') {
          setTracking(msg.payload);
        } else if (msg.type === 'COURIER_LOCATION') {
          setTracking((prev: any) => ({
            ...prev,
            courier: {
              ...prev?.courier,
              location: msg.payload,
            },
          }));
        }
      } catch (err) {
        console.warn('WS parse error', err);
      }
    };

    // 3. Fallback to REST polling if WebSocket closes or fails
    socket.onerror = () => {
      setIsWebSocketActive(false);
      startPolling();
    };

    socket.onclose = () => {
      setIsWebSocketActive(false);
      startPolling();
    };

    function startPolling() {
      if (!pollInterval) {
        pollInterval = setInterval(async () => {
          try {
            const data = await apiRequest(`/orders/${orderId}/tracking`);
            setTracking(data);
          } catch (e) {
            console.warn('Tracking poll failed', e);
          }
        }, 7000); // 7s polling interval
      }
    }

    return () => {
      socket.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [orderId]);

  return { tracking, isWebSocketActive };
}
```
