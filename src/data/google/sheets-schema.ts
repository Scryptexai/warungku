/**
 * Skema target Google Sheets milik warung (dibuat saat koneksi Tahap 2).
 *
 * Ditetapkan sejak Tahap 1 sebagai kontrak bersama agar:
 * - Tahap 2 tahu persis tab & kolom apa yang harus dibuat/dibaca.
 * - Pemilik warung tetap bisa membaca datanya secara manual di Sheets.
 *
 * CATATAN: konstanta ini belum dipakai oleh kode mana pun di Tahap 1;
 * GoogleSheetsStoreRepository akan menggunakannya pada Tahap 2.
 */

/** Nama tab (sheet) di dalam spreadsheet warung. */
export const SHEET_TAB_NAMES = {
  meta: "Meta",
  products: "Produk",
  customers: "Pelanggan",
  transactions: "Transaksi",
  transactionItems: "Detail_Transaksi",
  inventory: "Inventori",
  priceHistory: "Riwayat_Harga",
} as const;

/** Baris header tiap tab — kolom kunci selalu yang pertama. */
export const META_SHEET_COLUMNS = [
  "kunci",
  "nilai",
] as const;

export const PRODUCT_SHEET_COLUMNS = [
  "id",
  "barcode",
  "nama",
  "harga",
  "modal",
  "stok",
  "satuan",
  "kategori",
  "aktif",
  "dibuat",
  "diubah",
] as const;

export const CUSTOMER_SHEET_COLUMNS = [
  "id",
  "nama",
  "telepon",
  "alamat",
  "saldo_bon",
  "batas_bon",
  "aktif",
  "dibuat",
  "diubah",
] as const;

export const TRANSACTION_SHEET_COLUMNS = [
  "id",
  "waktu",
  "pelanggan_id",
  "pelanggan_nama",
  "pembayaran",
  "total",
  "status",
  "catatan",
  "tersinkron_pada",
] as const;

export const TRANSACTION_ITEM_SHEET_COLUMNS = [
  "transaksi_id",
  "produk_id",
  "produk_nama",
  "jumlah",
  "harga",
  "subtotal",
] as const;

export const INVENTORY_SHEET_COLUMNS = [
  "produk_id",
  "jumlah",
  "diperbarui",
] as const;

export const PRICE_HISTORY_SHEET_COLUMNS = [
  "id",
  "produk_id",
  "harga_lama",
  "harga_baru",
  "waktu",
  "oleh",
  "catatan",
] as const;
