import type { ISODateTime } from "@/types/shared";

/** Rentang waktu untuk kueri transaksi & laporan. */
export interface TimeRange {
  from: ISODateTime;
  to: ISODateTime;
}

/** Statistik penjualan satu produk pada rentang laporan. */
export interface ProductSalesStat {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

/**
 * Kontrak data laporan yang dikembalikan StoreDataRepository.getReportsData.
 * Tahap 5 memperluas kontrak ini; bentuk dasarnya ditetapkan sejak Tahap 1
 * agar arsitektur siap.
 */
export interface ReportsData {
  range: TimeRange;
  totalRevenue: number;
  totalTransactions: number;
  cashRevenue: number;
  bonRevenue: number;
  /** Total bon seluruh pelanggan yang belum lunas. */
  outstandingBonTotal: number;
  topProducts: ProductSalesStat[];
  generatedAt: ISODateTime;
}
