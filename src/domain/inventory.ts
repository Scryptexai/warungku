import type { ISODateTime } from "@/types/shared";

/**
 * Entitas Inventori — stok terkini per produk.
 * Sumber kebenaran stok tetap kolom `stock` pada Produk; entri ini adalah
 * jejak mutasi stok terakhir yang dipakai untuk rekonsiliasi sinkronisasi.
 */
export interface InventoryEntry {
  productId: string;
  /** Sisa stok terakhir yang diketahui (dalam satuan produk). */
  quantity: number;
  updatedAt: ISODateTime;
}

/** Alasan perubahan stok. */
export const INVENTORY_ADJUSTMENT_REASONS = [
  "SALE",
  "RESTOCK",
  "MANUAL_CORRECTION",
  "INITIAL_STOCK",
  "WASTE",
] as const;
export type InventoryAdjustmentReason = (typeof INVENTORY_ADJUSTMENT_REASONS)[number];

/**
 * Input pembaruan inventori berbasis delta (perubahan),
 * agar operasi offline aman digabung (commutative) saat disinkronkan.
 */
export interface UpdateInventoryInput {
  productId: string;
  /** Perubahan stok: negatif untuk pengurangan (penjualan), positif untuk tambah. */
  quantityDelta: number;
  reason: InventoryAdjustmentReason;
  note?: string | null;
}
