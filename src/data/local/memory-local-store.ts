import type {
  Customer,
  Product,
  Store,
  SyncQueueItem,
  SyncStatusSnapshot,
  Transaction,
} from "@/domain";
import type { CartItemSnapshot } from "@/lib/cart";
import type { LocalStore } from "./local-store";

/**
 * Implementasi LocalStore berbasis memori.
 * Dipakai saat rendering server (SSR), pengujian, dan lingkungan non-browser.
 * Data hilang saat proses berakhir — sesuai kebutuhan caching sementara.
 */
export class MemoryLocalStore implements LocalStore {
  private storeProfile: Store | null = null;
  private products: Product[] = [];
  private customers: Customer[] = [];
  private transactions: Transaction[] = [];
  private activeCart: CartItemSnapshot[] = [];
  private lowStockThresholds: Record<string, number> = {};
  private syncQueue: SyncQueueItem[] = [];
  private syncStatus: SyncStatusSnapshot | null = null;

  async getStoreProfile(): Promise<Store | null> {
    return this.storeProfile;
  }

  async setStoreProfile(store: Store | null): Promise<void> {
    this.storeProfile = store;
  }

  async getCachedProducts(): Promise<Product[]> {
    return [...this.products];
  }

  async setCachedProducts(products: Product[]): Promise<void> {
    this.products = [...products];
  }

  async upsertCachedProduct(product: Product): Promise<void> {
    const index = this.products.findIndex((item) => item.id === product.id);
    if (index === -1) {
      this.products = [product, ...this.products];
    } else {
      const next = [...this.products];
      next[index] = product;
      this.products = next;
    }
  }

  async getCachedCustomers(): Promise<Customer[]> {
    return [...this.customers];
  }

  async setCachedCustomers(customers: Customer[]): Promise<void> {
    this.customers = [...customers];
  }

  async upsertCachedCustomer(customer: Customer): Promise<void> {
    const index = this.customers.findIndex((item) => item.id === customer.id);
    if (index === -1) {
      this.customers = [customer, ...this.customers];
    } else {
      const next = [...this.customers];
      next[index] = customer;
      this.customers = next;
    }
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return [...this.transactions];
  }

  async upsertTransaction(transaction: Transaction): Promise<void> {
    const index = this.transactions.findIndex((item) => item.id === transaction.id);
    if (index === -1) {
      this.transactions = [transaction, ...this.transactions];
      return;
    }
    const next = [...this.transactions];
    next[index] = transaction;
    this.transactions = next;
  }

  async replaceAllTransactions(transactions: Transaction[]): Promise<void> {
    this.transactions = [...transactions];
  }

  async removeTransaction(transactionId: string): Promise<void> {
    this.transactions = this.transactions.filter((item) => item.id !== transactionId);
  }

  async markTransactionSynced(transactionId: string, syncedAt: string): Promise<void> {
    this.transactions = this.transactions.map((item) =>
      item.id === transactionId ? { ...item, syncedAt: item.syncedAt ?? syncedAt } : item,
    );
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    return this.transactions.filter((item) => item.syncedAt === null);
  }

  async getActiveCart(): Promise<CartItemSnapshot[]> {
    return [...this.activeCart];
  }

  async setActiveCart(items: CartItemSnapshot[]): Promise<void> {
    this.activeCart = [...items];
  }

  async getLowStockThresholds(): Promise<Record<string, number>> {
    return { ...this.lowStockThresholds };
  }

  async setLowStockThresholds(thresholds: Record<string, number>): Promise<void> {
    this.lowStockThresholds = { ...thresholds };
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return [...this.syncQueue];
  }

  async enqueueSyncItem(item: SyncQueueItem): Promise<void> {
    this.syncQueue = [...this.syncQueue, item];
  }

  async replaceSyncItem(item: SyncQueueItem): Promise<void> {
    const index = this.syncQueue.findIndex((queued) => queued.id === item.id);
    if (index === -1) {
      this.syncQueue = [...this.syncQueue, item];
      return;
    }
    const next = [...this.syncQueue];
    next[index] = item;
    this.syncQueue = next;
  }

  async removeSyncItem(itemId: string): Promise<void> {
    this.syncQueue = this.syncQueue.filter((queued) => queued.id !== itemId);
  }

  async getSyncStatus(): Promise<SyncStatusSnapshot | null> {
    return this.syncStatus ? { ...this.syncStatus } : null;
  }

  async setSyncStatus(status: SyncStatusSnapshot): Promise<void> {
    this.syncStatus = { ...status };
  }

  async clearAll(): Promise<void> {
    this.storeProfile = null;
    this.products = [];
    this.customers = [];
    this.transactions = [];
    this.activeCart = [];
    this.lowStockThresholds = {};
    this.syncQueue = [];
    this.syncStatus = null;
  }
}
