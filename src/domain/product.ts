import type { ISODateTime } from "@/types/shared";

/**
 * Satuan jual produk warung.
 * "pcs" adalah default; satuan berat/volume mendukung penjualan pecahan.
 */
export const PRODUCT_UNITS = [
  "pcs",
  "pack",
  "lusin",
  "kg",
  "gram",
  "liter",
  "ml",
  "papan",
  "ikat",
] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

/**
 * Entitas Produk — barang yang dijual warung.
 * Harga dan stok adalah "saat ini"; perubahan historis ada pada PriceHistory.
 */
export interface Product {
  id: string;
  /** Kode barcode (EAN/UPC). Null untuk produk tanpa barcode. */
  barcode: string | null;
  name: string;
  /** Harga jual saat ini dalam Rupiah (bilangan bulat). */
  currentPrice: number;
  /** Harga beli/modal, bila diketahui. */
  costPrice: number | null;
  /** Sisa stok dalam satuan `unit`. */
  stock: number;
  unit: ProductUnit;
  category: string | null;
  /** Produk non-aktif tidak muncul di kasir namun datanya tetap tersimpan. */
  isActive: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CreateProductInput {
  barcode?: string | null;
  name: string;
  currentPrice: number;
  costPrice?: number | null;
  stock?: number;
  unit?: ProductUnit;
  category?: string | null;
}

export interface UpdateProductInput {
  name?: string;
  barcode?: string | null;
  currentPrice?: number;
  costPrice?: number | null;
  stock?: number;
  unit?: ProductUnit;
  category?: string | null;
  isActive?: boolean;
}
