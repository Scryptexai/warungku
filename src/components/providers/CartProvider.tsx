"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/domain";
import type { LocalStore } from "@/data/local/local-store";
import {
  addToCart,
  cartCount,
  cartTotal,
  withoutItem,
  withQuantity,
  withUnitPrice,
  type CartItem,
} from "@/lib/cart";

/**
 * Keranjang transaksi aktif — dipakai layar scan/kasir.
 *
 * §6: keranjang PERSISTEN di perangkat (LocalStore.activeCart) — bila
 * aplikasi tertutup / HP mati / restart di tengah transaksi, bon yang
 * belum disimpan TIDAK hilang. Dikosongkan setelah transaksi disimpan.
 * Seluruh logika (merge jumlah, harga khusus, total) ada di lib/cart
 * murni — dipakai bersama uji otomatis.
 */

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  addProduct(product: Product, quantity?: number): void;
  setQuantity(productId: string, quantity: number): void;
  /** Ubah harga HANYA untuk transaksi ini (§5A — master tidak berubah). */
  setUnitPrice(productId: string, unitPrice: number): void;
  removeItem(productId: string): void;
  clear(): void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  localStore,
  children,
}: {
  localStore: LocalStore;
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Muat keranjang tersimpan sekali saat mount (pemulihan §6).
  useEffect(() => {
    let active = true;
    void localStore.getActiveCart().then((saved) => {
      if (active && saved.length > 0) setItems(saved);
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [localStore]);

  // Simpan setiap perubahan (setelah hidrasi) — keranjang tahan restart.
  useEffect(() => {
    if (!hydrated) return;
    void localStore.setActiveCart(items).catch(() => {
      // Penyimpanan penuh dlsb. — keranjang tetap hidup di memori; transaksi
      // tetap bisa disimpan (tulisan transaksi punya penanganan errornya).
    });
  }, [items, hydrated, localStore]);

  const addProduct = useCallback((product: Product, quantity = 1) => {
    setItems((current) => addToCart(current, product, quantity));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) => withQuantity(current, productId, quantity));
  }, []);

  const setUnitPrice = useCallback((productId: string, unitPrice: number) => {
    setItems((current) => withUnitPrice(current, productId, unitPrice));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => withoutItem(current, productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: cartCount(items),
      total: cartTotal(items),
      addProduct,
      setQuantity,
      setUnitPrice,
      removeItem,
      clear,
    }),
    [items, addProduct, setQuantity, setUnitPrice, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart hanya boleh dipakai di dalam <CartProvider>.");
  }
  return context;
}
