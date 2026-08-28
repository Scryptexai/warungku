import { NotConnectedAuthProvider } from "@/auth/not-connected-auth-provider";
import type { AuthProvider } from "@/auth/auth-provider";
import { createLocalStore } from "@/data/local";
import type { LocalStore } from "@/data/local";
import { NotConnectedGoogleApiClient } from "@/data/google/google-api-client";
import { GoogleSheetsStoreRepository } from "@/data/google/google-sheets-store-repository";
import type { StoreDataRepository } from "@/data/store-data-repository";
import { NotConnectedSyncTarget } from "@/sync/not-connected-sync-target";
import { QueueSyncEngine } from "@/sync/queue-sync-engine";
import type { SyncEngine, SyncTarget } from "@/sync/sync-engine";
import { CustomerService } from "./customer.service";
import { ProductService } from "./product.service";
import { SyncService } from "./sync.service";
import { TransactionService } from "./transaction.service";

/**
 * AKAR KOMPOSISI (composition root) Warungku.
 *
 * Satu-satunya tempat yang mengenal implementasi konkret. Semua dependensi
 * disuntikkan lewat konstruktor, sehingga:
 *
 * - UI hanya melihat container/layanan, tidak pernah implementasi storage.
 * - Tahap 2 menukar NotConnected* dengan implementasi Google sungguhan
 *   DI SINI SAJA — seluruh aplikasi lain tidak berubah.
 * - Pengujian bisa menyuntik implementasi palsu lewat `overrides`.
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
}

export function createAppContainer(
  overrides: AppContainerOverrides = {},
): AppContainer {
  const localStore = overrides.localStore ?? createLocalStore();

  // Tahap 1: seluruh komponen Google berstatus "belum terhubung".
  // Tahap 2 menggantinya dengan:
  //   - GoogleOAuthApiClient (token dari sesi OAuth)
  //   - GoogleSheetsStoreRepository yang berfungsi penuh
  //   - GoogleSheetsSyncTarget
  const googleClient = new NotConnectedGoogleApiClient();
  const repository = overrides.repository ?? new GoogleSheetsStoreRepository(googleClient);
  const authProvider = overrides.authProvider ?? new NotConnectedAuthProvider();
  const syncEngine =
    overrides.syncEngine ??
    new QueueSyncEngine({
      target: overrides.syncTarget ?? new NotConnectedSyncTarget(),
      localStore,
      listenToNetworkEvents: true,
    });

  return {
    localStore,
    repository,
    authProvider,
    syncEngine,
    sync: new SyncService(syncEngine),
    products: new ProductService({ repository, localStore, syncEngine }),
    customers: new CustomerService({ repository, localStore, syncEngine }),
    transactions: new TransactionService({ localStore, syncEngine }),
  };
}
