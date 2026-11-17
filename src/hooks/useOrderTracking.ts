import { useEffect, useState, useRef } from 'react';
import { WS_BASE_URL, ordersApi } from '../services/api';
import { OrderTracking } from '../types';

export function useOrderTracking(orderId: string | null | undefined) {
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [isWebSocketActive, setIsWebSocketActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const activeOrderId = orderId;

    let isMounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    setIsLoading(true);

    // 1. Initial REST fetch
    ordersApi
      .getOrderTracking(activeOrderId)
      .then((data) => {
        if (isMounted) setTracking(data);
      })
      .catch(() => {
        // Offline or local demo order not on backend yet
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // 2. Open Gorilla WebSocket connection for real-time updates
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(`${WS_BASE_URL}/orders/${orderId}`);
      wsRef.current = socket;

      socket.onopen = () => {
        if (isMounted) setIsWebSocketActive(true);
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ORDER_UPDATE' && msg.payload) {
            setTracking(msg.payload);
          } else if (msg.type === 'COURIER_LOCATION' && msg.payload) {
            setTracking((prev) =>
              prev
                ? {
                    ...prev,
                    courier: {
                      name: prev.courier?.name || 'Kisumu Express Delivery Team',
                      phone: prev.courier?.phone || '+254 704 769 219',
                      location: msg.payload,
                    },
                  }
                : prev
            );
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      socket.onerror = () => {
        if (isMounted) {
          setIsWebSocketActive(false);
          startPolling();
        }
      };

      socket.onclose = () => {
        if (isMounted) {
          setIsWebSocketActive(false);
          startPolling();
        }
      };
    } catch {
      startPolling();
    }

    function startPolling() {
      if (!pollInterval && isMounted) {
        pollInterval = setInterval(async () => {
          try {
            const data = await ordersApi.getOrderTracking(activeOrderId);
            if (isMounted) setTracking(data);
          } catch {
            // Ignore transient poll error
          }
        }, 7000);
      }
    }

    return () => {
      isMounted = false;
      if (socket) {
        try {
          socket.close();
        } catch {
          // Ignore close error
        }
      }
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [orderId]);

  return { tracking, isWebSocketActive, isLoading };
}
