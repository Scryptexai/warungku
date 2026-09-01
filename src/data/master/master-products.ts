import type { ProductUnit } from "@/domain";
import { normalizeBarcode } from "@/lib/barcode";
import { OFFLINE_CATALOG } from "./master-offline-catalog";

/**
 * MASTER PRODUK (§5D) — BARCODE NYATA SAJA.
 *
 * Setiap entri berasal dari rekam produk publik yang terverifikasi
 * (Open Food Facts Indonesia) dan lolos validasi GS1 — lihat provenance
 * per baris di master-offline-catalog.ts (source + sourceProductId).
 *
 * ATURAN §5D: tidak ada barcode karangan. Produk tanpa barcode nyata
 * TIDAK masuk master (barcode tidak boleh null-diisi-ditebak). Harga
 * referensi pun hanya terisi bila sumber kurasi memilikinya — selain itu
 * null dan harga jual ditentukan pemilik warung.
 *
 * Perluasan katalog: unduh halaman OFF tambahan → scripts/data/off-*.csv →
 * jalankan `node scripts/build-real-catalog.mjs` (laporan mutu nyata ikut
 * tergenerate di scripts/data/catalog-report-5d.md).
 */

export interface MasterProduct {
  /** Barcode NYATA (GTIN/EAN/UPC) — divalidasi digit cek GS1. */
  barcode: string;
  /** true = barcode berasal dari rekam produk terpercaya (bukan karangan). */
  barcodeVerified: boolean;
  name: string;
  brand: string | null;
  /** Varian/ukuran/kemasan (cth. "600ml", "85g"). */
  variant: string | null;
  category: string;
  /** Harga referensi bila sumber resmi memilikinya; null = isi sendiri. */
  suggestedPrice: number | null;
  unit: ProductUnit;
  /** Provenance: dari mana produk ini berasal. */
  source: string;
  /** ID produk pada sumber (OFF = kode barcode). */
  sourceProductId: string;
}

/** Kategori master yang tersedia (untuk pilih massal per kategori). */
export const MASTER_CATEGORIES = [
  "Makanan Instan",
  "Minuman",
  "Snack",
  "Rokok",
  "Bahan Masak",
  "Kebutuhan Rumah",
] as const;

/** Seluruh master produk offline — barcode nyata terverifikasi saja. */
export const MASTER_PRODUCTS: MasterProduct[] = OFFLINE_CATALOG;

const MASTER_BY_BARCODE = new Map<string, MasterProduct>(
  MASTER_PRODUCTS.map((item) => [normalizeBarcode(item.barcode), item]),
);

/**
 * Cari produk master berdasar barcode (OFFLINE, instan).
 * Input dinormalisasi dulu (spasi/format dibuang, nol depan dipertahankan).
 */
export function findMasterByBarcode(barcode: string): MasterProduct | null {
  return MASTER_BY_BARCODE.get(normalizeBarcode(barcode)) ?? null;
}
