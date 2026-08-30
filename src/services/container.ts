import { GoogleAuthProvider } from "@/auth/google-auth-provider";
import type { AuthProvider } from "@/auth/auth-provider";
import { createLocalStore } from "@/data/local";
import type { LocalStore } from "@/data/local";
import { GoogleSheetsStoreRepository } from "@/data/google/google-sheets-store-repository";
import { HttpGoogleApiClient } from "@/data/google/http-google-api-client";
import { GoogleSheetsSyncTarget } from "@/data/google/google-sheets-sync-target";
import type { StoreDataRepository } from "@/data/store-data-repository";
import { readShopProfile } from "./store-profile.service";
import { QueueSyncEngine } from "@/sync/queue-sync-engine";
import type { SyncEngine, SyncTarget } from "@/sync/sync-engine";
import { CustomerService } from "./customer.service";
import { ProductService } from "./product.service";
import { SaleService } from "./sale.service";
import { SyncService } from "./sync.service";
import { TransactionService } from "./transaction.service";

/**
 * AKAR KOMPOSISI (composition root) Warungku.
 *
 * Satu-satunya tempat yang mengenal implementasi konkret. Semua dependensi
 * disuntikkan lewat konstruktor, sehingga:
 *
 * - UI hanya melihat container/layanan, tidak pernah implementasi storage.
 * - Pengujian bisa menyuntik implementasi palsu lewat `overrides`.
 * - Google Sheets menjadi database utama melalui dua komponen:
 *   HttpGoogleApiClient (proksi server, token aman) dan
 *   GoogleSheetsSyncTarget (penulisan idempotent ke spreadsheet warung).
 */
export interface AppContainerOverrides {
  localStore?: LocalStore;
  repository?: StoreDataRepository;
  authProvider?: AuthProvider;
  syncTarget?: SyncTarget;
  syncEngine?: SyncEngine;
}

export interface AppContainer {
  localStore: LocalStore;
  repository: StoreDataRepository;
  authProvider: AuthProvider;
  syncEngine: SyncEngine;
  sync: SyncService;
  products: ProductService;
  customers: CustomerService;
  transactions: TransactionService;
  sales: SaleService;
}

export function createAppContainer(
  overrides: AppContainerOverrides = {},
): AppContainer {
  const localStore = overrides.localStore ?? createLocalStore();

  const googleClient = new HttpGoogleApiClient();
  // ID spreadsheet warung dibaca dari profil lokal (diisi saat koneksi Google)
  // dan dipakai bersama oleh repositori (baca) & target sinkron (tulis).
  const getSpreadsheetId = async (): Promise<string | null> =>
    (await readShopProfile(localStore)).spreadsheetId;
  const repository = new GoogleSheetsStoreRepository(googleClient, getSpreadsheetId);
  const authProvider = overrides.authProvider ?? new GoogleAuthProvider();

  const syncTarget =
    overrides.syncTarget ?? new GoogleSheetsSyncTarget(googleClient, getSpreadsheetId);

  // Penanda sync_status lokal — terhubung belakangan (transactions butuh
  // engine, engine butuh penanda) lewat closure; hanya dipanggil runtime.
  let transactionsService: TransactionService | null = null;

  const syncEngine =
    overrides.syncEngine ??
    new QueueSyncEngine({
      target: syncTarget,
      localStore,
      listenToNetworkEvents: true,
      onOperationSynced: (operation) => {
        if (operation.entity === "TRANSACTION" && operation.kind === "CREATE") {
          const payload = operation.payload as { id?: string } | null;
          if (payload && typeof payload.id === "string") {
            return transactionsService?.markSynced(payload.id);
          }
        }
        return undefined;
      },
    });

  const products = new ProductService({ repository, localStore, syncEngine });
  const customers = new CustomerService({ repository, localStore, syncEngine });
  transactionsService = new TransactionService({
    localStore,
    syncEngine,
    repository,
  });
  const transactions = transactionsService;

  return {
    localStore,
    repository,
    authProvider,
    syncEngine,
    sync: new SyncService(syncEngine),
    products,
    customers,
    transactions,
    sales: new SaleService(products, transactions, customers, syncEngine),
  };
}
