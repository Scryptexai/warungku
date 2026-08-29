import type {
  Customer,
  Product,
  Store,
  SyncQueueItem,
  SyncStatusSnapshot,
  Transaction,
} from "@/domain";

/**
 * KONTRAK PERSISTENSI LOKAL (perangkat).
 *
 * Semua akses penyimpanan perangkat HARUS melewati interface ini —
 * komponen UI tidak boleh menyentuh localStorage/IndexedDB secara langsung.
 * Implementasi bisa ditukar (browser/memory/IndexedDB) tanpa mengubah UI
 * maupun layanan.
 */

/** Kunci koleksi data lokal yang dikenal aplikasi. */
export const LOCAL_STORE_KEYS = [
  "products", // cache produk
  "customers", // cache pelanggan
  "pendingTransactions", // transaksi yang belum tersinkron
  "syncQueue", // antrean operasi sinkronisasi
  "syncStatus", // status sinkronisasi terakhir
  "storeProfile", // profil warung
] as const;
export type LocalStoreKey = (typeof LOCAL_STORE_KEYS)[number];

export interface LocalStore {
  // ------------------------------------------------------ Profil warung
  getStoreProfile(): Promise<Store | null>;
  setStoreProfile(store: Store | null): Promise<void>;

  // ------------------------------------------------------ Cache produk
  getCachedProducts(): Promise<Product[]>;
  setCachedProducts(products: Product[]): Promise<void>;
  upsertCachedProduct(product: Product): Promise<void>;

  // --------------------------------------------------- Cache pelanggan
  getCachedCustomers(): Promise<Customer[]>;
  setCachedCustomers(customers: Customer[]): Promise<void>;
  upsertCachedCustomer(customer: Customer): Promise<void>;

  // ------------------------------------------- Transaksi tertunda (bon)
  getPendingTransactions(): Promise<Transaction[]>;
  addPendingTransaction(transaction: Transaction): Promise<void>;
  /** Dipanggil setelah transaksi berhasil terkirim ke Google Sheets (Tahap 2). */
  removePendingTransaction(transactionId: string): Promise<void>;

  // --------------------------------------------- Antrean sinkronisasi
  getSyncQueue(): Promise<SyncQueueItem[]>;
  enqueueSyncItem(item: SyncQueueItem): Promise<void>;
  replaceSyncItem(item: SyncQueueItem): Promise<void>;
  removeSyncItem(itemId: string): Promise<void>;

  // ----------------------------------------------- Status sinkronisasi
  getSyncStatus(): Promise<SyncStatusSnapshot | null>;
  setSyncStatus(status: SyncStatusSnapshot): Promise<void>;

  // ------------------------------------------------------------ Utilitas
  /** Menghapus seluruh data lokal (dipakai saat putus koneksi warung). */
  clearAll(): Promise<void>;
}
