import type {
  Customer,
  Product,
  Store,
  SyncQueueItem,
  SyncStatusSnapshot,
  Transaction,
} from "@/domain";
import {
  LOCAL_STORAGE_NAMESPACE,
  LOCAL_STORAGE_SCHEMA_VERSION,
} from "@/config/app";
import { AppError } from "@/lib/errors";
import type { CartItemSnapshot } from "@/lib/cart";
import type { LocalStore, LocalStoreKey } from "./local-store";
import { LOCAL_STORE_KEYS } from "./local-store";

const KEY_PREFIX = `${LOCAL_STORAGE_NAMESPACE}:v${LOCAL_STORAGE_SCHEMA_VERSION}`;

/**
 * Implementasi LocalStore berbasis localStorage peramban.
 *
 * - Semua koleksi diserialisasi sebagai JSON dengan kunci ter-namespaced,
 *   sehingga migrasi skema di fase berikutnya tinggal menaikkan versi.
 * - Bila kelak dibutuhkan kapasitas lebih besar (mis. ribuan transaksi),
 *   implementasi IndexedDbLocalStore dapat menggantikan class ini tanpa
 *   mengubah satu baris UI/layanan.
 */
export class BrowserLocalStore implements LocalStore {
  constructor(private readonly storage: Storage) {}

  // ------------------------------------------------------------ Primitif IO

  private read<TValue>(key: LocalStoreKey, fallback: TValue): TValue {
    try {
      const raw = this.storage.getItem(`${KEY_PREFIX}:${key}`);
      if (raw === null) return fallback;
      return JSON.parse(raw) as TValue;
    } catch (error) {
      console.warn(
        `[warungku] Gagal membaca koleksi lokal "${key}"; memakai nilai default.`,
        error,
      );
      return fallback;
    }
  }

  private write<TValue>(key: LocalStoreKey, value: TValue): void {
    try {
      this.storage.setItem(`${KEY_PREFIX}:${key}`, JSON.stringify(value));
    } catch (error) {
      throw new AppError(
        "Gagal menyimpan data ke penyimpanan perangkat. Kemungkinan penyimpanan penuh.",
        { code: "STORAGE_ERROR", retryable: true, cause: error },
      );
    }
  }

  // ------------------------------------------------------------ Profil warung

  async getStoreProfile(): Promise<Store | null> {
    return this.read<Store | null>("storeProfile", null);
  }

  async setStoreProfile(store: Store | null): Promise<void> {
    this.write("storeProfile", store);
  }

  // ------------------------------------------------------------ Cache produk

  async getCachedProducts(): Promise<Product[]> {
    return this.read<Product[]>("products", []);
  }

  async setCachedProducts(products: Product[]): Promise<void> {
    this.write("products", products);
  }

  async upsertCachedProduct(product: Product): Promise<void> {
    const products = await this.getCachedProducts();
    const index = products.findIndex((item) => item.id === product.id);
    if (index === -1) {
      this.write("products", [product, ...products]);
    } else {
      products[index] = product;
      this.write("products", products);
    }
  }

  // --------------------------------------------------------- Cache pelanggan

  async getCachedCustomers(): Promise<Customer[]> {
    return this.read<Customer[]>("customers", []);
  }

  async setCachedCustomers(customers: Customer[]): Promise<void> {
    this.write("customers", customers);
  }

  async upsertCachedCustomer(customer: Customer): Promise<void> {
    const customers = await this.getCachedCustomers();
    const index = customers.findIndex((item) => item.id === customer.id);
    if (index === -1) {
      this.write("customers", [customer, ...customers]);
    } else {
      customers[index] = customer;
      this.write("customers", customers);
    }
  }

  // ------------------------------------------------- Transaksi (UTAMA)

  async getAllTransactions(): Promise<Transaction[]> {
    const raw = this.storage.getItem(`${KEY_PREFIX}:transactions`);
    if (raw === null) {
      // MIGRASI sekali jalan: aplikasi lama menyimpan transaksi tertunda di
      // koleksi "pendingTransactions" — pindahkan, jangan buang.
      const legacy = this.read<Transaction[]>("pendingTransactions", []);
      if (legacy.length > 0) {
        this.write("transactions", legacy);
        this.storage.removeItem(`${KEY_PREFIX}:pendingTransactions`);
        return legacy;
      }
      return [];
    }
    return this.read<Transaction[]>("transactions", []);
  }

  async upsertTransaction(transaction: Transaction): Promise<void> {
    const transactions = await this.getAllTransactions();
    const index = transactions.findIndex((item) => item.id === transaction.id);
    if (index === -1) {
      this.write("transactions", [transaction, ...transactions]);
      return;
    }
    transactions[index] = transaction;
    this.write("transactions", transactions);
  }

  async replaceAllTransactions(transactions: Transaction[]): Promise<void> {
    this.write("transactions", transactions);
  }

  async removeTransaction(transactionId: string): Promise<void> {
    const transactions = await this.getAllTransactions();
    this.write(
      "transactions",
      transactions.filter((item) => item.id !== transactionId),
    );
  }

  async markTransactionSynced(transactionId: string, syncedAt: string): Promise<void> {
    const transactions = await this.getAllTransactions();
    const next = transactions.map((item) =>
      item.id === transactionId
        ? { ...item, syncedAt: item.syncedAt ?? syncedAt }
        : item,
    );
    this.write("transactions", next);
    // Koleksi warisan tidak dipakai lagi; bersihkan bila ada.
    this.storage.removeItem(`${KEY_PREFIX}:pendingTransactions`);
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    const transactions = await this.getAllTransactions();
    return transactions.filter((item) => item.syncedAt === null);
  }

  // --------------------------------------------------- Antrean sinkronisasi

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return this.read<SyncQueueItem[]>("syncQueue", []);
  }

  async enqueueSyncItem(item: SyncQueueItem): Promise<void> {
    const queue = await this.getSyncQueue();
    this.write("syncQueue", [...queue, item]);
  }

  async replaceSyncItem(item: SyncQueueItem): Promise<void> {
    const queue = await this.getSyncQueue();
    const index = queue.findIndex((queued) => queued.id === item.id);
    if (index === -1) {
      this.write("syncQueue", [...queue, item]);
      return;
    }
    queue[index] = item;
    this.write("syncQueue", queue);
  }

  async removeSyncItem(itemId: string): Promise<void> {
    const queue = await this.getSyncQueue();
    this.write(
      "syncQueue",
      queue.filter((queued) => queued.id !== itemId),
    );
  }

  // ---------------------------------------------------- Keranjang aktif (§6)

  async getActiveCart(): Promise<CartItemSnapshot[]> {
    return this.read<CartItemSnapshot[]>("activeCart", []);
  }

  async setActiveCart(items: CartItemSnapshot[]): Promise<void> {
    this.write("activeCart", items);
  }

  async getLowStockThresholds(): Promise<Record<string, number>> {
    return this.read<Record<string, number>>("lowStockThresholds", {});
  }

  async setLowStockThresholds(thresholds: Record<string, number>): Promise<void> {
    this.write("lowStockThresholds", thresholds);
  }

  // ------------------------------------------------------ Status sinkronisasi

  async getSyncStatus(): Promise<SyncStatusSnapshot | null> {
    return this.read<SyncStatusSnapshot | null>("syncStatus", null);
  }

  async setSyncStatus(status: SyncStatusSnapshot): Promise<void> {
    this.write("syncStatus", status);
  }

  // ----------------------------------------------------------------- Utilitas

  async clearAll(): Promise<void> {
    for (const key of LOCAL_STORE_KEYS) {
      this.storage.removeItem(`${KEY_PREFIX}:${key}`);
    }
  }
}
