/**
 * OPERASI KERANJANG MURNI (§6) — tanpa React, tanpa jaringan.
 * Dipakai CartProvider (UI) DAN uji otomatis smoke — menjamin perilaku
 * yang sama di layar dan di pengujian:
 *
 * - barang sama dimasukkan lagi → JUMLAH bertambah (bukan baris baru),
 * - harga khusus transaksi (override kasir) TIDAK tertimpa harga master,
 * - total dihitung lokal, instan.
 */

import type { Product } from "@/domain";

export interface CartItemSnapshot {
  productId: string;
  barcode: string | null;
  name: string;
  unit: string;
  /** Harga baris (default harga master; bisa dioverride kasir per transaksi). */
  unitPrice: number;
  /** true bila kasir mengubah harga khusus transaksi ini. */
  priceOverridden: boolean;
  quantity: number;
}

export type CartItem = CartItemSnapshot;

/** Tambah produk ke keranjang — barang sama → jumlah bertambah. */
export function addToCart(
  items: CartItem[],
  product: Product,
  quantity = 1,
): CartItem[] {
  const safeQty = Math.max(1, Math.round(quantity));
  const index = items.findIndex((item) => item.productId === product.id);
  if (index === -1) {
    return [
      ...items,
      {
        productId: product.id,
        barcode: product.barcode,
        name: product.name,
        unit: product.unit,
        unitPrice: product.currentPrice,
        priceOverridden: false,
        quantity: safeQty,
      },
    ];
  }
  const next = [...items];
  next[index] = {
    ...next[index]!,
    // harga override kasir dipertahankan; tanpa override → ikut master terbaru
    unitPrice: next[index]!.priceOverridden
      ? next[index]!.unitPrice
      : product.currentPrice,
    quantity: next[index]!.quantity + safeQty,
  };
  return next;
}

/** Ubah jumlah satu baris (minimum 1). */
export function withQuantity(
  items: CartItem[],
  productId: string,
  quantity: number,
): CartItem[] {
  return items.map((item) =>
    item.productId === productId
      ? { ...item, quantity: Math.max(1, Math.round(quantity)) }
      : item,
  );
}

/** Ubah harga khusus transaksi untuk satu baris (master tidak berubah). */
export function withUnitPrice(
  items: CartItem[],
  productId: string,
  unitPrice: number,
): CartItem[] {
  return items.map((item) =>
    item.productId === productId
      ? {
          ...item,
          unitPrice: Math.max(0, Math.round(unitPrice)),
          priceOverridden: true,
        }
      : item,
  );
}

/** Hapus satu baris. */
export function withoutItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter((item) => item.productId !== productId);
}

/** Jumlah seluruh barang (unit). */
export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Total nilai keranjang — dihitung lokal, instan. */
export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}
