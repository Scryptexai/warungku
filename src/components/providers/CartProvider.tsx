"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/domain";

/**
 * Keranjang transaksi aktif — dipakai layar scan/kasir.
 * Bertahan selama sesi aplikasi (pindah halaman tidak menghapus keranjang);
 * dikosongkan setelah transaksi selesai disimpan.
 */

export interface CartItem {
  productId: string;
  barcode: string | null;
  name: string;
  unit: string;
  /** Harga saat produk dimasukkan; harga final diambil ulang saat menyimpan. */
  unitPrice: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  addProduct(product: Product, quantity?: number): void;
  setQuantity(productId: string, quantity: number): void;
  removeItem(productId: string): void;
  clear(): void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addProduct = useCallback((product: Product, quantity = 1) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.productId === product.id);
      if (index === -1) {
        return [
          ...current,
          {
            productId: product.id,
            barcode: product.barcode,
            name: product.name,
            unit: product.unit,
            unitPrice: product.currentPrice,
            quantity: Math.max(1, quantity),
          },
        ];
      }
      const next = [...current];
      next[index] = {
        ...next[index],
        unitPrice: product.currentPrice,
        quantity: next[index].quantity + Math.max(1, quantity),
      };
      return next;
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, Math.round(quantity)) }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return { items, count, total, addProduct, setQuantity, removeItem, clear };
  }, [items, addProduct, setQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart hanya boleh dipakai di dalam <CartProvider>.");
  }
  return context;
}
