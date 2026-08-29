import type {
  CreateCustomerInput,
  CreateProductInput,
  Customer,
  InventoryEntry,
  PriceHistoryEntry,
  Product,
  RecordPriceChangeInput,
  ReportsData,
  Store,
  TimeRange,
  Transaction,
  UpdateCustomerInput,
  UpdateInventoryInput,
  UpdateProductInput,
} from "@/domain";

/**
 * KONTRAK AKSES DATA WARUNG (remote).
 *
 * Ini adalah "port" utama aplikasi: seluruh logika bisnis berbicara dengan
 * interface ini, bukan langsung dengan Google Sheets.
 *
 * - Tahap 1: kerangka saja (belum ada implementasi Google).
 * - Tahap 2: GoogleSheetsStoreRepository mengimplementasikan kontrak ini
 *   di atas Google Sheets API — tanpa perubahan pada lapisan lain.
 *
 * Prinsip penting: `createTransaction`/operasi tulis menerima entitas yang
 * SUDAH terbentuk lengkap (dibuat lokal secara offline-first), sehingga
 * sisi remote cukup menulis baris ber-ID sama (idempotent).
 */
export interface StoreDataRepository {
  /** Profil warung sebagaimana tersimpan pada Sheet milik warung. */
  getStoreInfo(): Promise<Store | null>;

  // ---------------------------------------------------------------- Produk
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  /** Pencarian berdasar barcode untuk alur kasir scan (dipakai mulai Tahap 3). */
  getProductByBarcode(barcode: string): Promise<Product | null>;
  createProduct(input: CreateProductInput): Promise<Product>;
  updateProduct(id: string, input: UpdateProductInput): Promise<Product>;

  // -------------------------------------------------------------- Pelanggan
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | null>;
  createCustomer(input: CreateCustomerInput): Promise<Customer>;
  updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer>;

  // -------------------------------------------------------------- Transaksi
  /** Menulis transaksi yang sudah terbentuk (dari antrean sinkronisasi). */
  createTransaction(transaction: Transaction): Promise<void>;
  getTransactions(range?: TimeRange): Promise<Transaction[]>;

  // --------------------------------------------------------------- Inventori
  getInventory(productIds?: string[]): Promise<InventoryEntry[]>;
  updateInventory(input: UpdateInventoryInput): Promise<InventoryEntry>;

  // ----------------------------------------------------------- Riwayat harga
  getPriceHistory(productId?: string): Promise<PriceHistoryEntry[]>;
  recordPriceChange(input: RecordPriceChangeInput): Promise<PriceHistoryEntry>;

  // ----------------------------------------------------------------- Laporan
  getReportsData(range: TimeRange): Promise<ReportsData>;
}
