import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine } from "../types";

interface CartContextValue {
  items: CartLine[];
  addItem: (line: CartLine) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  clear: () => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "jh_shop_cart";

function sameLine(a: { productId: string; variantId: string | null }, b: { productId: string; variantId: string | null }) {
  return a.productId === b.productId && a.variantId === b.variantId;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (line: CartLine) => {
    setItems((prev) => {
      const existing = prev.find((p) => sameLine(p, line));
      if (existing) {
        const qty = Math.min(existing.quantity + line.quantity, existing.maxStock || 99);
        return prev.map((p) => (sameLine(p, line) ? { ...p, quantity: qty } : p));
      }
      return [...prev, line];
    });
  };

  const removeItem = (productId: string, variantId: string | null) => {
    setItems((prev) => prev.filter((p) => !sameLine(p, { productId, variantId })));
  };

  const updateQuantity = (productId: string, variantId: string | null, quantity: number) => {
    setItems((prev) =>
      prev
        .map((p) => (sameLine(p, { productId, variantId }) ? { ...p, quantity: Math.max(1, Math.min(quantity, p.maxStock || 99)) } : p))
        .filter((p) => p.quantity > 0)
    );
  };

  const clear = () => setItems([]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clear, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
