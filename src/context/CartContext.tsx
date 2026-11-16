import React, { createContext, useContext, useState } from 'react';
import { CartItem, Product, ProductOption } from '../types';

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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

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
  };

  const getItemQuantity = (productId: string) => {
    return items
      .filter((item) => item.product.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = subtotal > 0 ? 150 : 0;
  const vat = subtotal > 0 ? Number((subtotal * 0.16).toFixed(2)) : 0;
  const total = subtotal > 0 ? subtotal + deliveryFee : 0;

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
