import type { ISODateTime } from "@/types/shared";

/**
 * Entitas Riwayat Harga — jejak setiap perubahan harga jual produk.
 * Dipakai untuk laporan dan analisis strategi harga (Tahap 5 & 6).
 */
export interface PriceHistoryEntry {
  id: string;
  productId: string;
  previousPrice: number;
  newPrice: number;
  changedAt: ISODateTime;
  /** Pelaku perubahan (nama pengguna/akun), bila diketahui. */
  changedBy: string | null;
  note: string | null;
}

export interface RecordPriceChangeInput {
  productId: string;
  previousPrice: number;
  newPrice: number;
  changedBy?: string | null;
  note?: string | null;
}
