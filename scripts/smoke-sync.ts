/**
 * Uji asap (smoke test) arsitektur, produk, dan alur transaksi Tahap 3.
 *
 *   npm run smoke
 *
 * Mencakup:
 * 1. Mekanika antrean sinkronisasi (gagal → tetap di antrean; sambungan
 *    kembali → terkirim).
 * 2. Produk (warisan Tahap 2): tambah, cari, barcode→produk, ubah harga,
 *    cegah barcode ganda.
 * 3. ALUR TRANSAKSI TAHAP 3 (penuh, memakai GoogleSheetsSyncTarget asli
 *    dengan klien Google PALSU berbasis memori):
 *    - tunai & bon, total benar, stok berkurang, nama pembeli tersimpan,
 *    - harga historis tidak berubah setelah harga produk diubah,
 *    - penulisan idempotent (double-push tidak menduplikasi baris),
 *    - agregat CUSTOMERS benar, baris PRODUCTS/TRANSACTIONS/ITEMS benar.
 */
import { MemoryLocalStore } from "../src/data/local/memory-local-store";
import { NotConnectedGoogleApiClient } from "../src/data/google/google-api-client";
import type { GoogleApiClient, GoogleApiClientRequest } from "../src/data/google/google-api-client";
import { GoogleSheetsStoreRepository } from "../src/data/google/google-sheets-store-repository";
import { GoogleSheetsSyncTarget } from "../src/data/google/google-sheets-sync-target";
import { SHEET_NAMES } from "../src/data/google/sheets-schema";
import type { Product, SyncOperation, Transaction } from "../src/domain";
import { AppError } from "../src/lib/errors";
import { CustomerService } from "../src/services/customer.service";
import { ProductService } from "../src/services/product.service";
import { SaleService } from "../src/services/sale.service";
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

function appErrorOf(error: unknown): AppError {
  return error instanceof AppError ? error : new AppError("bukan AppError");
}

/** Klien Google PALSU — meniru Values API di memori. */
class FakeSheetsClient implements GoogleApiClient {
  readonly sheets = new Map<string, string[][]>();

  async isConnected(): Promise<boolean> {
    return true;
  }
  async getAccessToken(): Promise<string | null> {
    return "fake-token";
  }

  private ensure(name: string): string[][] {
    let rows = this.sheets.get(name);
    if (!rows) {
      rows = [];
      this.sheets.set(name, rows);
    }
    return rows;
  }

  private colIndex(letter: string): number {
    let index = 0;
    for (const char of letter.toUpperCase()) {
      index = index * 26 + (char.charCodeAt(0) - 64);
    }
    return index - 1;
  }

  async request<TResponse>(request: GoogleApiClientRequest): Promise<TResponse> {
    const match = request.path.match(/^\/v4\/spreadsheets\/([^/]+)\/values\/(.+)$/);
    if (!match) throw new Error(`Path tidak dikenal: ${request.path}`);
    const range = decodeURIComponent(match[2]).replace(/:append$/, "");
    const isAppend = request.path.endsWith(":append");
    const [sheetName, part] = range.split("!");
    const rows = this.ensure(sheetName);

    if (request.method === "POST" && isAppend) {
      const values = (request.body as { values: string[][] }).values;
      for (const row of values) rows.push(row.map(String));
      return { updated: values.length } as TResponse;
    }

    if (request.method === "PUT") {
      const rowNumber = Number(part.replace(/[A-Z]/gi, ""));
      const values = (request.body as { values: string[][] }).values[0];
      while (rows.length < rowNumber) rows.push([]);
      rows[rowNumber - 1] = values.map(String);
      return { updated: 1 } as TResponse;
    }

    // GET — kolom ("A:A") atau baris ("A3:E3").
    if (part.includes(":")) {
      const [from, to] = part.split(":");
      if (from.match(/^[A-Z]$/i) && to.match(/^[A-Z]$/i)) {
        const col = this.colIndex(from);
        return { values: rows.map((row) => [String(row[col] ?? "")]) } as TResponse;
      }
      const rowNum = Number(from.replace(/[A-Z]/gi, ""));
      const fromCol = this.colIndex(from.replace(/\d/g, ""));
      const toCol = this.colIndex(to.replace(/\d/g, ""));
      const row = rows[rowNum - 1] ?? [];
      return { values: [row.slice(fromCol, toCol + 1).map(String)] } as TResponse;
    }
    const rowNum = Number(part.replace(/[A-Z]/gi, ""));
    return { values: [rows[rowNum - 1] ?? []] } as TResponse;
  }
}

async function main(): Promise<void> {
  console.log("1) Mekanika antrean sinkronisasi");
  const localStoreA = new MemoryLocalStore();
  const engineOffline = new QueueSyncEngine({
    target: new NotConnectedSyncTarget(),
    localStore: localStoreA,
    listenToNetworkEvents: false,
  });
  await engineOffline.init();
  const transactionsA = new TransactionService({ localStore: localStoreA, syncEngine: engineOffline });
  await transactionsA.createTransaction({
    paymentType: "CASH",
    items: [{ productId: "prd_x", productName: "Contoh", quantity: 2, unitPrice: 2000 }],
  });
  let queue = await localStoreA.getSyncQueue();
  check(queue.length === 1, "transaksi offline masuk antrean");
  const skipped = await engineOffline.syncNow();
  check(skipped.skipped && (await localStoreA.getSyncQueue()).length === 1, "belum terhubung → operasi TETAP di antrean (data tidak hilang)");

  const failingTarget: SyncTarget = {
    isReady: async () => true,
    push: async () => {
      throw new Error("network down");
    },
  };
  const engineFailing = new QueueSyncEngine({ target: failingTarget, localStore: localStoreA, listenToNetworkEvents: false });
  await engineFailing.init();
  const failed = await engineFailing.syncNow();
  queue = await localStoreA.getSyncQueue();
  check(failed.failed === 1 && queue.length === 1 && queue[0].attempts === 1, "gagal kirim → tetap di antrean + percobaan tercatat");

  const received: SyncOperation[] = [];
  const readyTarget: SyncTarget = {
    isReady: async () => true,
    push: async (operation) => {
      received.push(operation);
    },
  };
  const engineOnline = new QueueSyncEngine({ target: readyTarget, localStore: localStoreA, listenToNetworkEvents: false });
  await engineOnline.init();
  const okSummary = await engineOnline.syncNow();
  check(okSummary.succeeded === 1 && (await localStoreA.getSyncQueue()).length === 0, "koneksi kembali → antrean terkirim & kosong");

  console.log("2) Produk (warisan Tahap 2)");
  const fakeClient = new FakeSheetsClient();
  const localStore = new MemoryLocalStore();
  const syncTarget = new GoogleSheetsSyncTarget(fakeClient, async () => "sheet-1");
  const engine = new QueueSyncEngine({ target: syncTarget, localStore, listenToNetworkEvents: false });
  await engine.init();
  const products = new ProductService({
    repository: new GoogleSheetsStoreRepository(new NotConnectedGoogleApiClient()),
    localStore,
    syncEngine: engine,
  });
  const customers = new CustomerService({ repository: new GoogleSheetsStoreRepository(new NotConnectedGoogleApiClient()), localStore, syncEngine: engine });
  const transactions = new TransactionService({ localStore, syncEngine: engine });
  const sales = new SaleService(products, transactions, customers, engine);

  const indomie = await products.createProduct({
    name: "Indomie Goreng",
    barcode: "8991002101234",
    category: "Makanan",
    currentPrice: 3500,
    stock: 50,
    unit: "pcs",
  });
  const gula = await products.createProduct({
    name: "Gula 1kg",
    barcode: "8991002105678",
    category: "Kebutuhan",
    currentPrice: 18000,
    stock: 10,
    unit: "pack",
  });
  check((await products.searchProducts("indomie")).length === 1, "cari nama → ketemu");
  check((await products.getProductByBarcode("8991002105678"))?.name === "Gula 1kg", "cari barcode → ketemu");
  try {
    await products.createProduct({ name: "Duplikat", barcode: "8991002101234", category: "X", currentPrice: 1, stock: 1 });
    check(false, "barcode ganda harus ditolak");
  } catch (error) {
    check(appErrorOf(error).message.includes("sudah terdaftar"), "barcode ganda ditolak + menunjuk produk lama");
  }

  await engine.syncNow();
  const productRows = fakeClient.sheets.get(SHEET_NAMES.products) ?? [];
  check(productRows.length === 2, "PRODUCTS: 2 baris produk tersinkron");
  check(productRows[0][1] === indomie.barcode && productRows[0][5] === "50", "PRODUCTS: kolom barcode & stok benar (upsert by barcode)");

  console.log("3) ALUR TRANSAKSI TAHAP 3 (tunai & bon → Google Sheets)");
  // Transaksi TUNAI: 3 Indomie @3500 = 10500.
  const cashSale = await sales.recordSale({
    items: [{ productId: indomie.id, quantity: 3 }],
    paymentType: "CASH",
  });
  check(cashSale.transaction.total === 10500, "TUNAI: total benar (3 × 3500 = 10500)");
  check((await products.getProductById(indomie.id))?.stock === 47, "TUNAI: stok berkurang 50 → 47");
  check(
    cashSale.sync.failed === 0 && (await localStore.getSyncQueue()).length === 0,
    "TUNAI: tersinkron ke Google Sheets (antrean kosong)",
  );
  const trxRows = fakeClient.sheets.get(SHEET_NAMES.transactions) ?? [];
  check(trxRows.length === 1 && trxRows[0][3] === "CASH" && trxRows[0][5] === "10500", "TRANSACTIONS: baris tunai + total benar");
  const itemRows = fakeClient.sheets.get(SHEET_NAMES.transactionItems) ?? [];
  check(itemRows.length === 1 && itemRows[0][1] === indomie.barcode && itemRows[0][4] === "3500", "TRANSACTION_ITEMS: barcode + harga 3500 tercatat");

  // Ubah harga produk → transaksi LAMA tetap memakai harga lama (§9).
  await products.updateProduct(indomie.id, { currentPrice: 4000 });
  await engine.syncNow();
  const trxBon = await sales.recordSale({
    items: [{ productId: indomie.id, quantity: 2 }],
    paymentType: "BON",
    customerName: "Pak Budi",
  });
  check(trxBon.transaction.total === 8000, "BON: total memakai harga TERBARU (2 × 4000 = 8000)");
  const itemRowsAfter = fakeClient.sheets.get(SHEET_NAMES.transactionItems) ?? [];
  check(itemRowsAfter[0][4] === "3500" && itemRowsAfter[1][4] === "4000", "harga historis tetap benar (lama 3500, baru 4000)");
  const customerRows1 = fakeClient.sheets.get(SHEET_NAMES.customers) ?? [];
  check(
    customerRows1.length === 1 &&
      customerRows1[0][1] === "Pak Budi" &&
      customerRows1[0][2] === "1" &&
      customerRows1[0][3] === "8000",
    "BON: CUSTOMERS tercatat (nama, 1 transaksi, bon 8000)",
  );
  const localCustomer = await customers.getOrCreateCustomerByName("pak budi");
  check(localCustomer.outstandingBalance === 8000, "BON: saldo bon lokal pelanggan = 8000");

  // Bon kedua untuk pelanggan yang sama → agregat bertambah, bukan baris baru.
  await sales.recordSale({
    items: [{ productId: gula.id, quantity: 1 }],
    paymentType: "BON",
    customerName: "Pak Budi",
  });
  const customerRows2 = fakeClient.sheets.get(SHEET_NAMES.customers) ?? [];
  check(
    customerRows2.length === 1 &&
      customerRows2[0][2] === "2" &&
      customerRows2[0][3] === "26000",
    "BON ke-2: agregat CUSTOMERS bertambah (2 transaksi, bon 26000)",
  );

  // Stok di sheet konsisten dengan transaksi.
  const finalRows = fakeClient.sheets.get(SHEET_NAMES.products) ?? [];
  const indomieRow = finalRows.find((row) => row[1] === indomie.barcode);
  check(indomieRow?.[5] === "45", "PRODUCTS: stok akhir di sheet = 45 (50 − 3 − 2)");

  // Idempotensi: kirim ulang transaksi yang sama → tidak ada duplikat.
  const trxCountBefore = (fakeClient.sheets.get(SHEET_NAMES.transactions) ?? []).length;
  const itemsCountBefore = (fakeClient.sheets.get(SHEET_NAMES.transactionItems) ?? []).length;
  await syncTarget.push({
    id: "op_duplicate",
    kind: "CREATE",
    entity: "TRANSACTION",
    payload: cashSale.transaction as Transaction,
    createdAt: new Date().toISOString(),
  });
  const trxCountAfter = (fakeClient.sheets.get(SHEET_NAMES.transactions) ?? []).length;
  const itemsCountAfter = (fakeClient.sheets.get(SHEET_NAMES.transactionItems) ?? []).length;
  check(trxCountAfter === trxCountBefore && itemsCountAfter === itemsCountBefore, "double-push tidak menduplikasi baris (idempotent by transaction_id)");

  // Validasi alur.
  try {
    await sales.recordSale({ items: [], paymentType: "CASH" });
    check(false, "transaksi kosong harus ditolak");
  } catch {
    check(true, "transaksi kosong ditolak");
  }
  try {
    await sales.recordSale({ items: [{ productId: indomie.id, quantity: 1 }], paymentType: "BON" });
    check(false, "bon tanpa nama harus ditolak");
  } catch (error) {
    check(appErrorOf(error).message.includes("nama pembeli"), "bon tanpa nama ditolak (nama wajib)");
  }
  try {
    await sales.recordSale({
      items: [{ productId: "prd_tidak_ada", quantity: 1 }],
      paymentType: "CASH",
    });
    check(false, "produk tidak dikenal harus ditolak");
  } catch {
    check(true, "produk tidak dikenal ditolak");
  }

  const finalIndomie = (await products.getProductById(indomie.id)) as Product;
  check(finalIndomie.currentPrice === 4000, "harga produk terbaru tersimpan (edit harga berfungsi)");

  if (failures > 0) {
    console.error(`\nGAGAL: ${failures} pemeriksaan tidak lolos.`);
    process.exit(1);
  }
  console.log("\nSemua pemeriksaan lolos — alur transaksi Tahap 3 berfungsi (lokal + Google Sheets).");
}

main().catch((error: unknown) => {
  console.error("Uji asap gagal dijalankan:", error);
  process.exit(1);
});
