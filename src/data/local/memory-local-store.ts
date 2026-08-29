import type {
  Customer,
  Product,
  Store,
  SyncQueueItem,
  SyncStatusSnapshot,
  Transaction,
} from "@/domain";
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
  private pendingTransactions: Transaction[] = [];
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

  async getPendingTransactions(): Promise<Transaction[]> {
    return [...this.pendingTransactions];
  }

  async addPendingTransaction(transaction: Transaction): Promise<void> {
    this.pendingTransactions = [transaction, ...this.pendingTransactions];
  }

  async removePendingTransaction(transactionId: string): Promise<void> {
    this.pendingTransactions = this.pendingTransactions.filter(
      (item) => item.id !== transactionId,
    );
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
    this.pendingTransactions = [];
    this.syncQueue = [];
    this.syncStatus = null;
  }
}
