import type {
  Customer,
  Product,
  Store,
  SyncQueueItem,
  SyncStatusSnapshot,
  Transaction,
} from "@/domain";
import type { CartItemSnapshot } from "@/lib/cart";

/**
 * KONTRAK PERSISTENSI LOKAL (perangkat).
 *
 * Semua akses penyimpanan perangkat HARUS melewati interface ini —
 * komponen UI tidak boleh menyentuh localStorage/IndexedDB secara langsung.
 * Implementasi bisa ditukar (browser/memory/IndexedDB) tanpa mengubah UI
 * maupun layanan.
 */

/**
 * Kunci koleksi data lokal yang dikenal aplikasi.
 * `pendingTransactions` adalah kunci WARISAN (pra-offline-first) —
 * dipertahankan agar migrasi data lama & clearAll tetap beres.
 */
export const LOCAL_STORE_KEYS = [
  "products", // database produk lokal (utama)
  "customers", // database pelanggan lokal (utama)
  "transactions", // DATABASE TRANSAKSI LOKAL (utama; sync_status = syncedAt)
  "pendingTransactions", // WARISAN — hanya untuk migrasi sekali jalan
  "syncQueue", // antrean operasi menuju Google Sheets
  "syncStatus", // status sinkronisasi terakhir
  "storeProfile", // profil warung
  "activeCart", // §6: keranjang transaksi berjalan (tahan restart)
  "lowStockThresholds", // §7: batas stok menipis per produk (preferensi pemilik)
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

  // ------------------------------------------------ Transaksi (UTAMA)
  /**
   * SELURUH transaksi di perangkat — ini adalah sumber baca utama
   * (offline-first). sync_status per transaksi diturunkan dari
   * `syncedAt`: null = PENDING (menunggu dikirim ke Sheets), terisi = SYNCED.
   */
  getAllTransactions(): Promise<Transaction[]>;
  /** Simpan / perbarui satu transaksi (menjaga urutan terbaru dulu). */
  upsertTransaction(transaction: Transaction): Promise<void>;
  /** Timpa seluruh koleksi transaksi (hasil merge pull dari Sheets). */
  replaceAllTransactions(transactions: Transaction[]): Promise<void>;
  /**
   * Hapus SATU transaksi dari perangkat — HANYA untuk rollback internal
   * §6 (menjaga transaksi+stok konsisten). Bukan operasi bisnis.
   */
  removeTransaction(transactionId: string): Promise<void>;
  /** Tandai transaksi sudah tersinkron ke Google Sheets (JANGAN dihapus). */
  markTransactionSynced(transactionId: string, syncedAt: string): Promise<void>;

  // ------------------------------- Transaksi tertunda (warisan/diturunkan)
  /** Transaksi yang belum tersinkron (syncedAt === null). */
  getPendingTransactions(): Promise<Transaction[]>;

  // --------------------------------------------- Antrean sinkronisasi
  getSyncQueue(): Promise<SyncQueueItem[]>;
  enqueueSyncItem(item: SyncQueueItem): Promise<void>;
  replaceSyncItem(item: SyncQueueItem): Promise<void>;
  removeSyncItem(itemId: string): Promise<void>;

  // ----------------------------------------------- Status sinkronisasi
  getSyncStatus(): Promise<SyncStatusSnapshot | null>;
  setSyncStatus(status: SyncStatusSnapshot): Promise<void>;

  // ------------------------------------------------ Keranjang aktif (§6)
  /**
   * Keranjang transaksi yang sedang berjalan — dipertahankan di perangkat
   * agar KASIR TIDAK KEHILANGAN bon yang belum disimpan saat aplikasi
   * tertutup/HP mati/restart di tengah transaksi. Dikosongkan setelah
   * transaksi selesai disimpan.
   */
  getActiveCart(): Promise<CartItemSnapshot[]>;
  setActiveCart(items: CartItemSnapshot[]): Promise<void>;

  // ------------------------------------- Batas stok menipis per produk (§7)
  // Preferensi pemilik (productId → batas). BUKAN database stok kedua —
  // nilai stok tetap hanya ada di entitas produk lokal.
  getLowStockThresholds(): Promise<Record<string, number>>;
  setLowStockThresholds(thresholds: Record<string, number>): Promise<void>;

  // ------------------------------------------------------------ Utilitas
  /** Menghapus seluruh data lokal (dipakai saat putus koneksi warung). */
  clearAll(): Promise<void>;
}
