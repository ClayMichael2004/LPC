import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Order, Product, ProductOption } from '../types';
import { ordersApi } from '../services/api';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number, selectedOption?: ProductOption) => void;
  incrementItem: (cartItemId: string) => void;
  decrementItem: (cartItemId: string) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
  subtotal: number;
  deliveryFee: number;
  vat: number;
  total: number;
  totalCount: number;
  lastPlacedOrder: Order | null;
  setLastPlacedOrder: (order: Order | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [serverSummary, setServerSummary] = useState<{
    subtotal: number;
    deliveryFee: number;
    vat: number;
    total: number;
  } | null>(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  // Sync authoritative server-side pricing whenever cart items change
  useEffect(() => {
    if (items.length === 0) {
      setServerSummary(null);
      return;
    }

    let cancelled = false;
    const payloadItems = items.map((item) => ({
      productId: item.product.id,
      optionId: item.selectedOption?.id,
      quantity: item.quantity,
    }));

    ordersApi
      .calculatePrice(payloadItems, 'delivery')
      .then((summary) => {
        if (!cancelled && summary) {
          setServerSummary({
            subtotal: summary.subtotal,
            deliveryFee: summary.deliveryFee,
            vat: summary.vat,
            total: summary.total,
          });
        }
      })
      .catch(() => {
        // Fallback to local calculation if offline
        if (!cancelled) setServerSummary(null);
      });

    return () => {
      cancelled = true;
    };
  }, [items]);

  const addToCart = (product: Product, quantity: number, selectedOption?: ProductOption) => {
    if (quantity <= 0) return;
    const optionId = selectedOption?.id || 'standard';
    const cartItemId = `${product.id}-${optionId}`;
    const unitPrice = product.price + (selectedOption?.extraPrice || 0);

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          totalPrice: newQty * unitPrice,
        };
        return updated;
      }
      return [
        ...prev,
        {
          cartItemId,
          product,
          quantity,
          selectedOption,
          unitPrice,
          totalPrice: quantity * unitPrice,
        },
      ];
    });
  };

  const incrementItem = (cartItemId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          const newQty = item.quantity + 1;
          return {
            ...item,
            quantity: newQty,
            totalPrice: newQty * item.unitPrice,
          };
        }
        return item;
      })
    );
  };

  const decrementItem = (cartItemId: string) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity - 1;
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setItems([]);
    setServerSummary(null);
  };

  const getItemQuantity = (productId: string) => {
    return items
      .filter((item) => item.product.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const localSubtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const localDeliveryFee = localSubtotal > 0 ? 150 : 0;
  const localVat = localSubtotal > 0 ? Number((localSubtotal * 0.16).toFixed(2)) : 0;
  const localTotal = localSubtotal > 0 ? localSubtotal + localDeliveryFee : 0;

  const subtotal = serverSummary ? serverSummary.subtotal : localSubtotal;
  const deliveryFee = serverSummary ? serverSummary.deliveryFee : localDeliveryFee;
  const vat = serverSummary ? serverSummary.vat : localVat;
  const total = serverSummary ? serverSummary.total : localTotal;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        incrementItem,
        decrementItem,
        removeItem,
        clearCart,
        getItemQuantity,
        subtotal,
        deliveryFee,
        vat,
        total,
        totalCount,
        lastPlacedOrder,
        setLastPlacedOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
