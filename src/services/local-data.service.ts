import type { LocalStore } from "@/data/local/local-store";

/** Ringkasan isi penyimpanan lokal — untuk kartu status di Beranda. */
export interface LocalDataSummary {
  cachedProducts: number;
  cachedCustomers: number;
  pendingTransactions: number;
  queuedSyncOperations: number;
}

export async function readLocalDataSummary(
  localStore: LocalStore,
): Promise<LocalDataSummary> {
  const [products, customers, transactions, queue] = await Promise.all([
    localStore.getCachedProducts(),
    localStore.getCachedCustomers(),
    localStore.getPendingTransactions(),
    localStore.getSyncQueue(),
  ]);
  return {
    cachedProducts: products.length,
    cachedCustomers: customers.length,
    pendingTransactions: transactions.length,
    queuedSyncOperations: queue.length,
  };
}
