import type { ISODateTime } from "@/types/shared";

/** Cara pembayaran transaksi. BON = dibayar kemudian (piutang pelanggan). */
export const PAYMENT_TYPES = ["CASH", "BON"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

/**
 * Status transaksi.
 * Status sinkronisasi TIDAK ada di sini — kelengkapan pengiriman ke Google
 * Sheets dipantau lewat antrean sinkronisasi, bukan status transaksi.
 */
export const TRANSACTION_STATUSES = ["COMPLETED", "VOIDED"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

/** Referensi pelanggan pada transaksi (snapshot nama agar riwayat tetap benar). */
export interface TransactionCustomerRef {
  /** Null bila pembeli bon dicatat cepat tanpa profil pelanggan. */
  id: string | null;
  name: string;
}

/** Satu baris barang dalam transaksi. */
export interface TransactionItem {
  transactionId: string;
  productId: string;
  /** Barcode saat transaksi terjadi (snapshot — untuk riwayat & Sheets). */
  barcode: string | null;
  /** Nama produk saat transaksi terjadi (snapshot). */
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * Entitas Transaksi — satu nota penjualan.
 * Dibuat lokal dulu (offline-first) lalu diantrekan untuk Google Sheets.
 */
export interface Transaction {
  id: string;
  timestamp: ISODateTime;
  /** Null untuk pembeli umum (tunai tanpa data pelanggan). */
  customer: TransactionCustomerRef | null;
  paymentType: PaymentType;
  /** Total nilai transaksi = jumlah seluruh subtotal item. */
  total: number;
  status: TransactionStatus;
  items: TransactionItem[];
  note: string | null;
  /** Diisi engine sinkronisasi setelah transaksi diterima Google Sheets. */
  syncedAt: ISODateTime | null;
}

export interface CreateTransactionItemInput {
  productId: string;
  barcode?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateTransactionInput {
  /** Wajib untuk pembayaran BON; opsional untuk CASH (pembeli umum). */
  customer?: { id: string | null; name: string } | null;
  paymentType: PaymentType;
  items: CreateTransactionItemInput[];
  note?: string | null;
  /** Default: waktu pembuatan. */
  timestamp?: ISODateTime;
}
