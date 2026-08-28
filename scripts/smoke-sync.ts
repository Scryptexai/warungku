/**
 * Uji asap (smoke test) arsitektur inti Tahap 1 — dijalankan tanpa peramban:
 *
 *   npm run smoke
 *
 * Memverifikasi dengan kode sungguhan (bukan mock tipe):
 * 1. Pola offline-first layanan transaksi & produk (tulis lokal → antrean).
 * 2. Mekanika antrean sinkronisasi:
 *    belum terhubung → tetap di antrean; gagal kirim → tetap di antrean +
 *    percobaan tercatat; koneksi kembali → terkirim & antrean kosong.
 * 3. Perubahan harga produk menghasilkan operasi riwayat harga.
 * 4. Validasi input menolak transaksi tanpa item.
 */
import { MemoryLocalStore } from "../src/data/local/memory-local-store";
import { NotConnectedGoogleApiClient } from "../src/data/google/google-api-client";
import { GoogleSheetsStoreRepository } from "../src/data/google/google-sheets-store-repository";
import type { SyncOperation } from "../src/domain";
import { ProductService } from "../src/services/product.service";
import { TransactionService } from "../src/services/transaction.service";
import { NotConnectedSyncTarget } from "../src/sync/not-connected-sync-target";
import { QueueSyncEngine } from "../src/sync/queue-sync-engine";
import type { SyncTarget } from "../src/sync/sync-engine";

let failures = 0;

function check(condition: unknown, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${message}`);
  }
}

async function main(): Promise<void> {
  console.log("1) Transaksi offline-first (target Google Sheets belum terhubung)");
  const localStore = new MemoryLocalStore();
  const engine = new QueueSyncEngine({
    target: new NotConnectedSyncTarget(),
    localStore,
    listenToNetworkEvents: false,
  });
  await engine.init();

  const transactions = new TransactionService({ localStore, syncEngine: engine });
  const trx = await transactions.createTransaction({
    paymentType: "CASH",
    items: [
      { productId: "prd_demo_1", productName: "Indomie Goreng", quantity: 2, unitPrice: 3500 },
      { productId: "prd_demo_2", productName: "Teh Tubruk", quantity: 1, unitPrice: 2000 },
    ],
  });
  check(trx.total === 9000, "subtotal item dihitung benar (2×3500 + 1×2000 = 9000)");
  check(trx.items.every((item) => item.subtotal === item.quantity * item.unitPrice), "setiap item punya subtotal = jumlah × harga");
  check((await localStore.getPendingTransactions()).length === 1, "transaksi tersimpan lokal sebagai pending");

  let queue = await localStore.getSyncQueue();
  check(queue.length === 1 && queue[0].operation.entity === "TRANSACTION", "operasi TRANSAKSI masuk antrean sinkronisasi");

  const skippedSummary = await engine.syncNow();
  queue = await localStore.getSyncQueue();
  check(skippedSummary.skipped && queue.length === 1, "target belum siap → operasi TETAP di antrean (tidak hilang)");
  check(engine.getStatus().state === "WAITING", "status engine menjadi WAITING");

  console.log("2) Target siap tetapi pengiriman gagal (simulasi jaringan putus)");
  const failingTarget: SyncTarget = {
    isReady: async () => true,
    push: async () => {
      throw new Error("network down");
    },
  };
  const engineAfterFailure = new QueueSyncEngine({
    target: failingTarget,
    localStore,
    listenToNetworkEvents: false,
  });
  await engineAfterFailure.init();
  const failedSummary = await engineAfterFailure.syncNow();
  queue = await localStore.getSyncQueue();
  check(failedSummary.failed === 1 && queue.length === 1, "gagal kirim → operasi tetap di antrean");
  check(queue[0].attempts === 1 && queue[0].lastError !== null, "jumlah percobaan & pesan error tercatat");
  check(engineAfterFailure.getStatus().state === "ERROR", "status engine ERROR (akan dicoba ulang)");

  console.log("3) Koneksi kembali → antrean terkirim semua");
  const received: SyncOperation[] = [];
  const readyTarget: SyncTarget = {
    isReady: async () => true,
    push: async (operation) => {
      received.push(operation);
    },
  };
  const engineOnline = new QueueSyncEngine({
    target: readyTarget,
    localStore,
    listenToNetworkEvents: false,
  });
  await engineOnline.init();
  const okSummary = await engineOnline.syncNow();
  queue = await localStore.getSyncQueue();
  check(okSummary.succeeded === 1 && queue.length === 0, "operasi terkirim dan keluar dari antrean");
  check(engineOnline.getStatus().state === "SYNCED", "status engine SYNCED");
  check(received[0]?.entity === "TRANSACTION", "target menerima operasi TRANSAKSI");

  console.log("4) Produk: perubahan harga meninggalkan riwayat harga");
  const localStore2 = new MemoryLocalStore();
  const engine2 = new QueueSyncEngine({
    target: new NotConnectedSyncTarget(),
    localStore: localStore2,
    listenToNetworkEvents: false,
  });
  await engine2.init();
  const products = new ProductService({
    repository: new GoogleSheetsStoreRepository(new NotConnectedGoogleApiClient()),
    localStore: localStore2,
    syncEngine: engine2,
  });
  const product = await products.createProduct({ name: "Teh Kotak", currentPrice: 5000, stock: 10 });
  await products.updateProduct(product.id, { currentPrice: 5500 });
  const productQueue = await localStore2.getSyncQueue();
  const entities = productQueue.map((item) => `${item.operation.entity}:${item.operation.kind}`);
  check(entities.includes("PRODUCT:CREATE"), "operasi PRODUCT:CREATE masuk antrean");
  check(entities.includes("PRICE_HISTORY:CREATE"), "perubahan harga menghasilkan operasi PRICE_HISTORY:CREATE");
  check((await localStore2.getCachedProducts())[0]?.currentPrice === 5500, "cache lokal produk diperbarui");

  console.log("5) Validasi menolak input tidak sah");
  try {
    await transactions.createTransaction({ paymentType: "CASH", items: [] });
    check(false, "transaksi tanpa item harus ditolak");
  } catch {
    check(true, "transaksi tanpa item ditolak");
  }
  try {
    await transactions.createTransaction({
      paymentType: "BON",
      items: [{ productId: "prd_demo_1", productName: "Indomie Goreng", quantity: 1, unitPrice: 3500 }],
      customer: null,
    });
    check(false, "transaksi bon tanpa pelanggan harus ditolak");
  } catch {
    check(true, "transaksi bon tanpa pelanggan ditolak");
  }

  if (failures > 0) {
    console.error(`\nGAGAL: ${failures} pemeriksaan tidak lolos.`);
    process.exit(1);
  }
  console.log("\nSemua pemeriksaan lolos — arsitektur inti Tahap 1 berfungsi.");
}

main().catch((error: unknown) => {
  console.error("Uji asap gagal dijalankan:", error);
  process.exit(1);
});
