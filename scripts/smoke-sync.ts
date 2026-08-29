/**
 * Uji asap (smoke test) arsitektur & logika produk — dijalankan tanpa peramban:
 *
 *   npm run smoke
 *
 * Mencakup:
 * 1. Pola offline-first layanan transaksi (tulis lokal → antrean).
 * 2. Mekanika antrean sinkronisasi: belum terhubung / gagal kirim → operasi
 *    tetap di antrean; koneksi kembali → terkirim.
 * 3. Produk (uji penerimaan Tahap 2, level logika):
 *    tambah produk, cari nama & barcode, barcode→produk, ubah harga,
 *    perbarui stok, cegah barcode ganda, validasi form.
 * 4. Validasi transaksi menolak input tidak sah.
 */
import { MemoryLocalStore } from "../src/data/local/memory-local-store";
import { NotConnectedGoogleApiClient } from "../src/data/google/google-api-client";
import { GoogleSheetsStoreRepository } from "../src/data/google/google-sheets-store-repository";
import type { SyncOperation } from "../src/domain";
import { AppError } from "../src/lib/errors";
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

/** Ambil kode AppError dari error apa pun (untuk pesan validasi). */
function appErrorOf(error: unknown): AppError {
  return error instanceof AppError ? error : new AppError("bukan AppError");
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

  console.log("4) Produk — uji penerimaan Tahap 2 (level logika)");
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

  // UJI 1 — tambah produk manual → langsung muncul di daftar.
  const product = await products.createProduct({
    name: "Indomie Goreng",
    barcode: "8991002101234",
    category: "Makanan",
    currentPrice: 3500,
    stock: 24,
  });
  check((await localStore2.getCachedProducts()).length === 1, "TEST 1: produk baru langsung muncul di daftar");

  // UJI 6 — barcode duplikat ditolak + menunjuk produk yang sudah ada.
  try {
    await products.createProduct({
      name: "Mi Duplikat",
      barcode: "8991002101234",
      category: "Makanan",
      currentPrice: 3000,
      stock: 1,
    });
    check(false, "TEST 6: barcode duplikat harus ditolak");
  } catch (error) {
    const appError = appErrorOf(error);
    check(
      appError.code === "VALIDATION_FAILED" &&
        appError.message.includes("sudah terdaftar") &&
        (appError.details as { existingProductId?: string } | undefined)?.existingProductId === product.id,
      "TEST 6: barcode duplikat ditolak + menunjuk produk yang sudah ada",
    );
  }

  // UJI 2 — cari berdasarkan nama & barcode.
  check((await products.searchProducts("indomie")).length === 1, "TEST 2a: cari nama → produk ditemukan");
  check((await products.searchProducts("8991002101")).length === 1, "TEST 2b: cari barcode → produk ditemukan");
  check((await products.searchProducts("kopi")).length === 0, "TEST 2c: tanpa hasil → daftar kosong (tanpa error)");

  // UJI 4 — barcode yang sudah ada → produk dikenali.
  const byBarcode = await products.getProductByBarcode("8991002101234");
  check(byBarcode?.name === "Indomie Goreng", "TEST 4: scan barcode yang sudah ada → produk dikenali tanpa input ulang");

  // UJI 3 — ubah harga → tersimpan.
  await products.updateProduct(product.id, { currentPrice: 4000 });
  check((await products.getProductById(product.id))?.currentPrice === 4000, "TEST 3: harga baru tersimpan setelah edit");

  // Stok dapat diperbarui (nilai stok saja — pengurangan otomatis menyusul di Tahap 3).
  await products.updateProduct(product.id, { stock: 30 });
  check((await products.getProductById(product.id))?.stock === 30, "stok dapat diperbarui nilainya");

  // Riwayat harga TIDAK direkam (di luar lingkup fase ini).
  const productEntities = (await localStore2.getSyncQueue()).map(
    (item) => `${item.operation.entity}:${item.operation.kind}`,
  );
  check(productEntities.includes("PRODUCT:CREATE"), "operasi PRODUCT:CREATE masuk antrean (siap Tahap 4)");
  check(!productEntities.includes("PRICE_HISTORY:CREATE"), "riwayat harga TIDAK direkam (di luar lingkup)");

  // Validasi form — pesan bahasa Indonesia sederhana.
  try {
    await products.createProduct({ name: "", barcode: "123456", category: "X", currentPrice: 100, stock: 1 });
    check(false, "nama kosong harus ditolak");
  } catch (error) {
    check(appErrorOf(error).message.includes("Nama produk wajib"), "nama kosong ditolak dengan pesan sederhana");
  }
  try {
    await products.createProduct({ name: "Tanpa Barcode", barcode: "", category: "X", currentPrice: 100, stock: 1 });
    check(false, "barcode kosong harus ditolak");
  } catch (error) {
    check(appErrorOf(error).message.includes("Barcode wajib"), "barcode kosong ditolak dengan pesan sederhana");
  }
  try {
    await products.createProduct({ name: "Harga Aneh", barcode: "1234567890", category: "X", currentPrice: -5, stock: 1 });
    check(false, "harga negatif harus ditolak");
  } catch (error) {
    check(appErrorOf(error).message.includes("Harga"), "harga negatif ditolak dengan pesan sederhana");
  }
  try {
    await products.createProduct({ name: "Stok Aneh", barcode: "1234567891", category: "X", currentPrice: 100, stock: 2.5 });
    check(false, "stok pecahan harus ditolak");
  } catch (error) {
    check(appErrorOf(error).message.includes("Stok"), "stok pecahan ditolak dengan pesan sederhana");
  }

  console.log("5) Validasi transaksi menolak input tidak sah");
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
  console.log("\nSemua pemeriksaan lolos — fondasi + sistem produk Tahap 2 berfungsi.");
}

main().catch((error: unknown) => {
  console.error("Uji asap gagal dijalankan:", error);
  process.exit(1);
});
