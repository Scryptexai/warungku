/**
 * Skema Google Sheets milik warung — DATABASE UTAMA aplikasi.
 * Dibuat/diperiksa otomatis saat warung menghubungkan akun Google-nya
 * (lihat /api/sheets/setup). Satu spreadsheet per warung, dimiliki akun
 * Google warung itu sendiri.
 *
 * Struktur ini adalah kontrak bersama antara:
 * - setup route (membuat tab + header),
 * - GoogleSheetsSyncTarget (menulis baris secara idempotent),
 * - fase berikutnya (pencarian, laporan, AI) yang membaca data ini.
 */

/** Nama tab (sheet) di dalam spreadsheet warung. */
export const SHEET_NAMES = {
  products: "PRODUCTS",
  transactions: "TRANSACTIONS",
  transactionItems: "TRANSACTION_ITEMS",
  customers: "CUSTOMERS",
} as const;

/** Baris header tiap tab — kolom kunci selalu yang pertama. */
export const PRODUCTS_COLUMNS = [
  "product_id",
  "barcode",
  "product_name",
  "category",
  "price",
  "stock",
  "unit",
  "updated_at",
] as const;

export const TRANSACTIONS_COLUMNS = [
  "transaction_id",
  "date",
  "time",
  "payment_type",
  "customer_name",
  "total_amount",
] as const;

export const TRANSACTION_ITEMS_COLUMNS = [
  "transaction_id",
  "barcode",
  "product_name",
  "quantity",
  "unit_price",
  "subtotal",
] as const;

export const CUSTOMERS_COLUMNS = [
  "customer_id",
  "customer_name",
  "total_transactions",
  "total_debt",
  "last_transaction",
] as const;

/** Semua tab yang wajib ada + headernya. */
export const REQUIRED_SHEETS: Array<{
  name: string;
  columns: readonly string[];
}> = [
  { name: SHEET_NAMES.products, columns: PRODUCTS_COLUMNS },
  { name: SHEET_NAMES.transactions, columns: TRANSACTIONS_COLUMNS },
  { name: SHEET_NAMES.transactionItems, columns: TRANSACTION_ITEMS_COLUMNS },
  { name: SHEET_NAMES.customers, columns: CUSTOMERS_COLUMNS },
];

/** Nama file spreadsheet warung di Google Drive. */
export function buildSpreadsheetTitle(shopName: string): string {
  const clean = shopName.trim().replace(/\s+/g, " ").slice(0, 40) || "Toko";
  return `Warungku — ${clean}`;
}
