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
import { normalizeBarcode, validateBarcode } from "../src/lib/barcode";
import { parseProductCsv } from "../src/lib/csv";
import { MASTER_PRODUCTS, findMasterByBarcode } from "../src/data/master/master-products";
import { RETIRED_BARCODES } from "../src/data/master/retired-barcodes";
import { addToCart, cartTotal, type CartItem } from "../src/lib/cart";
import {
  bonCustomerSummaries,
  buildReportDocument,
  slowMovingProducts,
  stockOverview,
  summarizeTransactions,
  topProducts,
} from "../src/lib/reports";
import {
  reportToCsv,
  reportToPdf,
  transactionsToCsv,
} from "../src/lib/report-export";
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

/** Digit cek GS1 mod-10 dari 12 digit body (untuk fixture barcode uji). */
function gs1Barcode(body12: string): string {
  const digits = body12.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += i % 2 === 0 ? digits[i]! : digits[i]! * 3;
  return `${body12}${(10 - (sum % 10)) % 10}`;
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

    // GET — kolom ("B:B"), rentang multi-baris ("A2:Z"), atau baris tunggal ("A3:E3").
    if (part.includes(":")) {
      const [from, to] = part.split(":");
      if (from.match(/^[A-Z]$/i) && to.match(/^[A-Z]$/i)) {
        const col = this.colIndex(from);
        return { values: rows.map((row) => [String(row[col] ?? "")]) } as TResponse;
      }
      if (from.match(/^[A-Z]\d+$/i) && to.match(/^[A-Z]$/i)) {
        const fromCol = this.colIndex(from.replace(/\d/g, ""));
        const toCol = this.colIndex(to);
        const start = Number(from.replace(/[A-Z]/gi, "")) - 1;
        return {
          values: rows
            .slice(start)
            .map((row) => row.slice(fromCol, toCol + 1).map(String)),
        } as TResponse;
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
  const transactionsA = new TransactionService({ localStore: localStoreA, syncEngine: engineOffline, repository: new GoogleSheetsStoreRepository(new NotConnectedGoogleApiClient()) });
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
  check((await transactionsA.listTransactions()).length === 1, "riwayat transaksi TETAP di perangkat setelah terkirim (database utama = lokal)");
  const localTrx = (await transactionsA.listTransactions())[0]!;
  await transactionsA.markSynced(localTrx.id);
  const markedTrx = (await transactionsA.listTransactions())[0]!;
  check(
    markedTrx.syncedAt !== null && (await transactionsA.getPendingTransactions()).length === 0,
    "markSynced MENANDAI synced — bukan menghapus (Sheets = cadangan)",
  );

  console.log("2) Produk (warisan Tahap 2)");
  const fakeClient = new FakeSheetsClient();
  // Headernya ditulis oleh /api/sheets/setup — tiru kondisi nyata.
  fakeClient.sheets.set(SHEET_NAMES.products, [
    ["product_id", "barcode", "product_name", "category", "selling_price", "stock", "unit", "created_at", "updated_at", "active"],
  ]);
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
  const transactions = new TransactionService({ localStore, syncEngine: engine, repository: new GoogleSheetsStoreRepository(new NotConnectedGoogleApiClient()) });
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
    barcode: "8991002105676",
    category: "Kebutuhan",
    currentPrice: 18000,
    stock: 10,
    unit: "pack",
  });
  check((await products.searchProducts("indomie")).length === 1, "cari nama → ketemu");
  check((await products.getProductByBarcode("8991002105676"))?.name === "Gula 1kg", "cari barcode → ketemu");
  check((await products.searchProducts("kebutuhan")).length === 1, "cari kategori → ketemu (Kebutuhan → Gula)");
  try {
    await products.createProduct({ name: "Duplikat", barcode: "8991002101234", category: "X", currentPrice: 1, stock: 1 });
    check(false, "barcode ganda harus ditolak");
  } catch (error) {
    check(appErrorOf(error).message.includes("sudah terdaftar"), "barcode ganda ditolak + menunjuk produk lama");
  }

  await engine.syncNow();
  const productRows = (fakeClient.sheets.get(SHEET_NAMES.products) ?? []).slice(1); // tanpa header
  check(productRows.length === 2, "PRODUCTS: 2 baris produk tersinkron (satu barcode = satu baris)");
  check(
    productRows[0][1] === indomie.barcode && productRows[0][5] === "50",
    "PRODUCTS: kolom barcode & stok benar (upsert by barcode)",
  );
  check(
    productRows[0][4] === "3500" && productRows[0][7] !== "" && productRows[0][9] === "TRUE",
    "PRODUCTS: selling_price / created_at / active tertulis lengkap",
  );

  console.log("3) ALUR TRANSAKSI TAHAP 3 (tunai & bon → Google Sheets)");
  // Transaksi TUNAI: 3 Indomie @3500 = 10500.
  const cashSale = await sales.recordSale({
    items: [{ productId: indomie.id, quantity: 3 }],
    paymentType: "CASH",
  });
  check(cashSale.transaction.total === 10500, "TUNAI: total benar (3 × 3500 = 10500)");
  check((await products.getProductById(indomie.id))?.stock === 47, "TUNAI: stok berkurang 50 → 47 (LOKAL, tanpa internet)");
  // §5B: recordSale tidak menunggu Sheets — flush eksplisit untuk assertion.
  await engine.syncNow();
  check((await localStore.getSyncQueue()).length === 0, "TUNAI: tersinkron ke Google Sheets (antrean kosong)");
  const trxRows = fakeClient.sheets.get(SHEET_NAMES.transactions) ?? [];
  check(trxRows.length === 1 && trxRows[0][3] === "CASH" && trxRows[0][5] === "10500", "TRANSACTIONS: baris tunai + total benar");
  const itemRows = fakeClient.sheets.get(SHEET_NAMES.transactionItems) ?? [];
  check(
    itemRows.length === 1 &&
      itemRows[0][1] === indomie.id &&
      itemRows[0][2] === indomie.barcode &&
      itemRows[0][5] === "3500",
    "TRANSACTION_ITEMS: product_id (hub) + barcode + harga 3500 tercatat",
  );

  // Ubah harga produk → transaksi LAMA tetap memakai harga lama (§9).
  await products.updateProduct(indomie.id, { currentPrice: 4000 });
  await engine.syncNow();

  // BACA ULANG dari "Google Sheets" (round-trip: tulis → baca → cache).
  const reader = new GoogleSheetsStoreRepository(fakeClient, async () => "sheet-1");
  const fromSheets = await reader.getProducts();
  const indomieSheets = fromSheets.find((p) => p.barcode === indomie.barcode);
  check(fromSheets.length === 2, "READ: katalog terbaca dari spreadsheet (2 produk)");
  check(
    indomieSheets?.currentPrice === 4000 &&
      indomieSheets.stock === 47 &&
      indomieSheets.isActive &&
      indomieSheets.unit === "pcs" &&
      indomieSheets.id === indomie.id,
    "READ: harga terbaru / stok / aktif / satuan / product_id stabil terbaca benar",
  );
  check(
    (await reader.getProductByBarcode(gula.barcode!))?.name === "Gula 1kg",
    "READ: getProductByBarcode dari spreadsheet bekerja",
  );
  // Simulasi perangkat baru: cache kosong → isi dari hasil baca Sheets.
  const newDeviceStore = new MemoryLocalStore();
  await newDeviceStore.setCachedProducts(fromSheets);
  check(
    (await newDeviceStore.getCachedProducts()).length === 2,
    "READ: perangkat baru bisa memulihkan katalog dari Google Sheets",
  );

  // Edit satuan produk (identitas produk tidak berubah).
  await products.updateProduct(gula.id, { unit: "kg" });
  check((await products.getProductById(gula.id))?.unit === "kg", "EDIT: satuan produk bisa diubah");
  const trxBon = await sales.recordSale({
    items: [{ productId: indomie.id, quantity: 2 }],
    paymentType: "BON",
    customerName: "Pak Budi",
  });
  check(trxBon.transaction.total === 8000, "BON: total memakai harga TERBARU (2 × 4000 = 8000)");
  await engine.syncNow();
  const itemRowsAfter = fakeClient.sheets.get(SHEET_NAMES.transactionItems) ?? [];
  check(itemRowsAfter[0][5] === "3500" && itemRowsAfter[1][5] === "4000", "harga historis tetap benar (lama 3500, baru 4000)");
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
  await engine.syncNow(); // §5B: recordSale non-blocking → flush sebelum baca sheet
  const customerRows2 = fakeClient.sheets.get(SHEET_NAMES.customers) ?? [];
  check(
    customerRows2.length === 1 &&
      customerRows2[0][2] === "2" &&
      customerRows2[0][3] === "26000",
    "BON ke-2: agregat CUSTOMERS bertambah (2 transaksi, bon 26000)",
  );

  // Stok di sheet konsisten dengan transaksi.
  await engine.syncNow();
  const finalRows = (fakeClient.sheets.get(SHEET_NAMES.products) ?? []).slice(1);
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

  // Pencarian pelanggan BON (§8) — nama + total bon.
  const foundCustomers = await customers.searchCustomers("budi");
  check(
    foundCustomers.length === 1 &&
      foundCustomers[0].name === "Pak Budi" &&
      foundCustomers[0].outstandingBalance === 26000,
    "CUSTOMER SEARCH: cari 'budi' → Pak Budi + total bon 26000",
  );

  console.log("4) UJI PENERIMAAN TAHAP 5");
  // TEST B — banyak produk dalam SATU transaction_id.
  const rokok = await products.createProduct({
    name: "Rokok Sampoerna",
    barcode: "8991389111222",
    category: "Rokok",
    currentPrice: 25000,
    stock: 20,
    unit: "pack",
  });
  const multiSale = await sales.recordSale({
    items: [
      { productId: indomie.id, quantity: 1 },
      { productId: gula.id, quantity: 2 },
      { productId: rokok.id, quantity: 1 },
    ],
    paymentType: "CASH",
  });
  const expectedTotal = 4000 + 2 * 18000 + 25000;
  const multiItems = multiSale.transaction.items;
  check(multiSale.transaction.total === expectedTotal, `TEST B: total multi-produk benar (${expectedTotal})`);
  check(
    multiItems.length === 3 && multiItems.every((item) => item.transactionId === multiSale.transaction.id),
    "TEST B: 3 item terhubung dalam SATU transaction_id",
  );
  check(
    (await products.getProductById(rokok.id))?.stock === 19,
    "TEST F: stok rokok 20 → 19 setelah transaksi",
  );

  // Stok tidak mencukupi → ditolak sebelum menyimpan (§14).
  try {
    await sales.recordSale({
      items: [{ productId: rokok.id, quantity: 999 }],
      paymentType: "CASH",
    });
    check(false, "stok tidak cukup harus ditolak");
  } catch (error) {
    check(
      appErrorOf(error).message.includes("tidak cukup"),
      "stok tidak cukup ditolak dengan pesan sederhana",
    );
    check(
      (await products.getProductById(rokok.id))?.stock === 19,
      "penolakan stok tidak mengubah stok",
    );
  }

  // TEST G — gagal menyimpan → transaksi tidak dianggap berhasil, stok utuh.
  class GagalSimpanStore extends MemoryLocalStore {
    async upsertTransaction(): Promise<void> {
      throw new Error("penyimpanan gagal");
    }
  }
  const gagalStore = new GagalSimpanStore();
  const engineGagal = new QueueSyncEngine({ target: syncTarget, localStore: gagalStore, listenToNetworkEvents: false });
  await engineGagal.init();
  const productsGagal = new ProductService({ repository: new GoogleSheetsStoreRepository(new NotConnectedGoogleApiClient()), localStore: gagalStore, syncEngine: engineGagal });
  const salesGagal = new SaleService(
    productsGagal,
    new TransactionService({ localStore: gagalStore, syncEngine: engineGagal, repository: new GoogleSheetsStoreRepository(new NotConnectedGoogleApiClient()) }),
    new CustomerService({ repository: new GoogleSheetsStoreRepository(new NotConnectedGoogleApiClient()), localStore: gagalStore, syncEngine: engineGagal }),
    engineGagal,
  );
  const stokGagal = await productsGagal.createProduct({
    name: "Kopi Kapal",
    barcode: "8991112223338",
    category: "Minuman",
    currentPrice: 2000,
    stock: 15,
    unit: "pcs",
  });
  try {
    await salesGagal.recordSale({
      items: [{ productId: stokGagal.id, quantity: 3 }],
      paymentType: "CASH",
    });
    check(false, "kegagalan penyimpanan harus melempar error");
  } catch {
    check(
      (await productsGagal.getProductById(stokGagal.id))?.stock === 15,
      "TEST G: gagal simpan → stok TIDAK berkurang (15)",
    );
  }

  // ================================================== TAHAP 5A
  console.log("5) UJI PENERIMAAN TAHAP 5A — INPUT TRANSAKSI CEPAT");
  // Simulasi warung nyata: satu transaksi 30 jenis barang (+ barang
  // berulang → jumlah digabung UI menjadi satu baris qty 3).
  const produk5a: Array<{ id: string; harga: number }> = [];
  for (let i = 0; i < 30; i += 1) {
    const created = await products.createProduct({
      name: `Produk Uji 5A-${i}`,
      barcode: gs1Barcode(`89955500${String(i).padStart(4, "0")}`),
      category: "Snack",
      currentPrice: 1000 + i * 100,
      stock: 50,
      unit: "pcs",
    });
    produk5a.push({ id: created.id, harga: created.currentPrice });
  }

  // Barang #0 dijual dengan harga khusus transaksi (override) —
  // snapshot transaksi memakai override, harga master TIDAK berubah.
  const hargaKhusus = 4321;
  const sale5a = await sales.recordSale({
    items: [
      { productId: produk5a[0]!.id, quantity: 1, unitPrice: hargaKhusus },
      { productId: produk5a[1]!.id, quantity: 3 }, // "barang sama 3×" → qty 3
      ...produk5a.slice(2, 30).map((p) => ({ productId: p.id, quantity: 1 })),
    ],
    paymentType: "CASH",
  });
  check(sale5a.transaction.items.length === 30, "5A: transaksi 30 jenis barang tersimpan");
  check(
    sale5a.transaction.items[0]!.unitPrice === hargaKhusus,
    "5A: harga khusus transaksi dipakai sebagai snapshot (4321)",
  );
  check(
    (await products.getProductById(produk5a[0]!.id))?.currentPrice === produk5a[0]!.harga,
    "5A: harga MASTER produk tidak ikut berubah oleh harga transaksi",
  );
  const totalHarapan =
    hargaKhusus +
    produk5a[1]!.harga * 3 +
    produk5a.slice(2, 30).reduce((sum, p) => sum + p.harga, 0);
  check(sale5a.transaction.total === totalHarapan, `5A: total 30 barang benar (${totalHarapan})`);
  check(
    (await products.getProductById(produk5a[1]!.id))?.stock === 47,
    "5A: barang berulang (qty 3) memotong stok 50 → 47",
  );

  // BON cepat: pelanggan baru → buku bon terhubung.
  const bon5a = await sales.recordSale({
    items: [
      { productId: produk5a[2]!.id, quantity: 2 },
      { productId: produk5a[3]!.id, quantity: 1 },
    ],
    paymentType: "BON",
    customerName: "Bu Siti 5A",
  });
  check(bon5a.transaction.paymentType === "BON", "5A: transaksi BON tersimpan");
  const siti = (await customers.searchCustomers("siti 5a"))[0];
  check(Boolean(siti), "5A: pelanggan BON ditemukan lewat pencarian cepat");
  check(
    siti?.outstandingBalance === bon5a.transaction.total,
    "5A: buku bon pelanggan (outstandingBalance) menerima total transaksi",
  );
  const riwayat = await transactions.listTransactions();
  check(
    riwayat.length >= 2 && riwayat.some((t) => t.id === sale5a.transaction.id),
    "5A: riwayat transaksi lokal memuat transaksi besar & bon",
  );

  // ================================================== TAHAP 5B
  console.log("6) UJI PENERIMAAN TAHAP 5B — MESIN TRANSAKSI OFFLINE-FIRST");
  // Perangkat 5B: store lokal + layanan sendiri, engine OFFLINE (NotConnected).
  const store5b = new MemoryLocalStore();
  const repoOff = new GoogleSheetsStoreRepository(new NotConnectedGoogleApiClient());
  const engineOff = new QueueSyncEngine({ target: new NotConnectedSyncTarget(), localStore: store5b, listenToNetworkEvents: false });
  await engineOff.init();
  const products5b = new ProductService({ repository: repoOff, localStore: store5b, syncEngine: engineOff });
  const customers5b = new CustomerService({ repository: repoOff, localStore: store5b, syncEngine: engineOff });
  const transactions5b = new TransactionService({ localStore: store5b, syncEngine: engineOff, repository: repoOff });
  const sales5b = new SaleService(products5b, transactions5b, customers5b, engineOff);
  const beras = await products5b.createProduct({ name: "Beras 5kg", barcode: "8996660000011", category: "Bahan Masak", currentPrice: 68000, stock: 100, unit: "pack" });
  const telur = await products5b.createProduct({ name: "Telur 1kg", barcode: "8996660000028", category: "Bahan Masak", currentPrice: 28000, stock: 100, unit: "kg" });

  // TEST 2+3 — OFFLINE: 5 transaksi (4 tunai + 1 bon) tanpa internet.
  for (let i = 0; i < 4; i += 1) {
    await sales5b.recordSale({ items: [{ productId: beras.id, quantity: 1 }], paymentType: "CASH" });
  }
  await sales5b.recordSale({ items: [{ productId: telur.id, quantity: 2 }], paymentType: "BON", customerName: "Pak Off" });
  const lokal5b = await transactions5b.listTransactions();
  check(lokal5b.length === 5, "5B TEST 2/3: 5 transaksi tersimpan LOKAL saat offline");
  check(lokal5b.every((t) => t.syncedAt === null), "5B TEST 3: semua berstatus PENDING (belum sinkron)");
  const queue5b = await store5b.getSyncQueue();
  check(queue5b.length >= 5, `5B TEST 3: antrean sync terisi (${queue5b.length} operasi), tidak ada data hilang`);
  check((await products5b.getProductById(telur.id))?.stock === 98, "5B: stok LOKAL berkurang offline (100 → 98) tanpa menunggu Sheets");

  // TEST 8 — OFFLINE BON: saldo bon pelanggan diperbarui lokal.
  const pakOff = (await customers5b.searchCustomers("pak off"))[0]!;
  check(pakOff.outstandingBalance === 56000, "5B TEST 8: BON offline → saldo bon pelanggan lokal 56000");

  // TEST 6 — RESTART: engine dibuang & dibuat ulang (crash); antrean dipulihkan.
  const queueSebelum = (await store5b.getSyncQueue()).slice();
  await store5b.replaceSyncItem({ ...queueSebelum[0]!, status: "IN_PROGRESS", updatedAt: new Date().toISOString() });
  const engineOff2 = new QueueSyncEngine({ target: new NotConnectedSyncTarget(), localStore: store5b, listenToNetworkEvents: false });
  await engineOff2.init(); // pemulihan: IN_PROGRESS → PENDING
  const queueSetelah = await store5b.getSyncQueue();
  check(queueSetelah.length === queueSebelum.length, "5B TEST 6: antrean bertahan setelah 'restart' aplikasi");
  check(queueSetelah.every((item) => item.status !== "IN_PROGRESS"), "5B TEST 6: item IN_PROGRESS dipulihkan ke PENDING");

  // TEST 5 — SYNC FAILURE: target gagal → transaksi tetap ada, retry tercatat.
  const failing5b: SyncTarget = {
    isReady: async () => true,
    push: async () => { throw new Error("jaringan mati"); },
  };
  const engineFail5b = new QueueSyncEngine({ target: failing5b, localStore: store5b, listenToNetworkEvents: false });
  await engineFail5b.init();
  const failSummary = await engineFail5b.syncNow();
  const queueFail = await store5b.getSyncQueue();
  check(failSummary.failed > 0 && queueFail.length === queueSebelum.length, "5B TEST 5: gagal kirim → antrean TIDAK kosong (data aman)");
  check(queueFail.some((item) => item.attempts >= 1), "5B TEST 5: percobaan ulang tercatat (attempts + lastError)");
  check((await transactions5b.listTransactions()).length === 5, "5B TEST 5: transaksi tetap tersedia lokal setelah gagal sync");

  // TEST 4+1 — RECONNECT: internet kembali → sinkronisasi otomatis-ish (manual trigger) semua SYNCED.
  const fake5b = new FakeSheetsClient();
  const target5b = new GoogleSheetsSyncTarget(fake5b, async () => "sheet-5b");
  // Hook yang sama dengan composition root: TRANSAKSI sukses → tandai
  // synced di database lokal (transaksi TIDAK dihapus).
  const engineOn5b = new QueueSyncEngine({
    target: target5b,
    localStore: store5b,
    listenToNetworkEvents: false,
    onOperationSynced: (operation) => {
      if (operation.entity === "TRANSACTION" && operation.kind === "CREATE") {
        const payload = operation.payload as { id?: string } | null;
        if (payload?.id) return transactions5b.markSynced(payload.id);
      }
      return undefined;
    },
  });
  await engineOn5b.init();
  const reconnect = await engineOn5b.syncNow();
  check(reconnect.succeeded === queueSebelum.length && reconnect.failed === 0, "5B TEST 4: online kembali → seluruh antrean terkirim");
  check((await store5b.getSyncQueue()).length === 0, "5B TEST 4: antrean kosong setelah sinkron");
  const rows5b = fake5b.sheets.get(SHEET_NAMES.transactions) ?? [];
  check(rows5b.length === 5, "5B TEST 1/4: Google Sheets menerima 5 transaksi");
  const lokal5bAfter = await transactions5b.listTransactions();
  check(lokal5bAfter.every((t) => t.syncedAt !== null), "5B TEST 4: kelima transaksi berstatus SYNCED (tidak terhapus)");

  // TEST 7 — DUPLICATE RETRY: push ulang transaksi yang sama → tetap 1 baris.
  const dupTrx = lokal5bAfter[0]!;
  const rowsBefore = (fake5b.sheets.get(SHEET_NAMES.transactions) ?? []).length;
  await target5b.push({ id: "op5b-dup", kind: "CREATE", entity: "TRANSACTION", payload: dupTrx, createdAt: new Date().toISOString() });
  await target5b.push({ id: "op5b-dup2", kind: "CREATE", entity: "TRANSACTION", payload: dupTrx, createdAt: new Date().toISOString() });
  check((fake5b.sheets.get(SHEET_NAMES.transactions) ?? []).length === rowsBefore, "5B TEST 7: retry dobel tidak menduplikasi transaksi (idempotent by id)");

  // PERFORMANCE — commit lokal tidak menunggu jaringan (target lambat 150ms).
  const storeSlow = new MemoryLocalStore();
  const slowTarget: SyncTarget = {
    isReady: async () => true,
    push: () => new Promise<void>((resolve) => { setTimeout(resolve, 150); }),
  };
  const engineSlow = new QueueSyncEngine({ target: slowTarget, localStore: storeSlow, listenToNetworkEvents: false });
  await engineSlow.init();
  const productsSlow = new ProductService({ repository: repoOff, localStore: storeSlow, syncEngine: engineSlow });
  const salesSlow = new SaleService(
    productsSlow,
    new TransactionService({ localStore: storeSlow, syncEngine: engineSlow, repository: repoOff }),
    new CustomerService({ repository: repoOff, localStore: storeSlow, syncEngine: engineSlow }),
    engineSlow,
  );
  const produkSlow = await productsSlow.createProduct({ name: "Sabun 5B", barcode: "8996660000035", category: "Kebutuhan Rumah", currentPrice: 5000, stock: 10, unit: "pcs" });
  const t0 = Date.now();
  const slowSale = await salesSlow.recordSale({ items: [{ productId: produkSlow.id, quantity: 1 }], paymentType: "CASH" });
  const commitMs = Date.now() - t0;
  check(slowSale.transaction.syncedAt === null && commitMs < 150, "5B PERFORMANCE: transaksi selesai SEBELUM respons lambat jaringan (commit lokal = sukses)");
  await engineSlow.syncNow();
  check((await storeSlow.getSyncQueue()).length === 0, "5B PERFORMANCE: latar belakang menyelesaikan pengiriman setelahnya");

  // ================================================== TAHAP 5D
  console.log("7) UJI PENERIMAAN TAHAP 5D — KATALOG BARCODE NYATA");
  // a) Normalisasi & validasi GS1 (lib barcode).
  const normLeadingZero = normalizeBarcode(" 0896 8677-0032.6 ");
  check(
    normLeadingZero === "0896867700326" && normLeadingZero.startsWith("0"),
    "5D: normalisasi buang format & PERTAHANKAN nol depan (string)",
  );
  check(validateBarcode("0896867700326").valid, "5D: barcode 13-digit nol-depan valid (Club)");
  check(!validateBarcode("8991002101235").valid, "5D: digit cek salah → DITOLAK");
  check(!validateBarcode("12345678").valid, "5D: pola placeholder 12345678 → DITOLAK");
  check(!validateBarcode("89912345678").valid, "5D: panjang 11 tidak didukung → DITOLAK");

  // b) Integritas master: SEMUA barcode nyata-format, unik, terverifikasi,
  //    berasal dari sumber (provenance), harga bukan karangan.
  const masterBarcodes = new Set(MASTER_PRODUCTS.map((m) => m.barcode));
  check(
    masterBarcodes.size === MASTER_PRODUCTS.length,
    `5D: ${MASTER_PRODUCTS.length} barcode master unik (tanpa duplikat)`,
  );
  check(
    MASTER_PRODUCTS.every((m) => validateBarcode(m.barcode).valid && m.barcodeVerified),
    "5D: semua barcode master lolos validasi GS1 & bertanda verified",
  );
  check(
    MASTER_PRODUCTS.every((m) => m.source === "Open Food Facts" && m.sourceProductId === m.barcode),
    "5D: provenance (source + sourceProductId) lengkap di seluruh master",
  );
  check(
    MASTER_PRODUCTS.every((m) => m.suggestedPrice === null || m.suggestedPrice > 0),
    "5D: harga referensi hanya bila sumber punya (sisanya null, bukan karangan)",
  );
  check(
    MASTER_PRODUCTS.every((m) => !RETIRED_BARCODES.has(m.barcode)),
    "5D: TIDAK ada barcode sintetis pension di master baru",
  );

  // c) UJI 10 PRODUK FISIK (barcode nyata hasil pindaian pengguna OFF):
  //    barcode fisik = database → lookup → DITEMUKAN (alur scan lengkap).
  const realProducts: Array<[string, string]> = [
    ["0089686010947", "Indomie Mi Goreng"],
    ["8886008101053", "Aqua Botol 600"],
    ["8996001600146", "Teh Pucuk Harum"],
    ["8996001600269", "Mountain Mineral Water"],
    ["8998009010613", "Ultra Milk Full Cream"],
    ["8997035563414", "POCARI SWEAT"],
    ["8998866200301", "Mi Sedaap"],
    ["8996001301142", "Roma Biskuit Kelapa"],
    ["8992761136161", "Coca-Cola"],
    ["0896867700326", "Club Air Mineral"],
  ];
  let realOk = 0;
  for (const [code, expectName] of realProducts) {
    const hit = findMasterByBarcode(code);
    if (hit && validateBarcode(hit.barcode).valid && hit.name.includes(expectName)) realOk += 1;
  }
  check(realOk === realProducts.length, `5D: ${realOk}/${realProducts.length} produk fisik → scan→lookup→DITEMUKAN`);

  // d) Katalog warung: barcode tidak valid DITOLAK di input kasir & impor CSV.
  try {
    await products.createProduct({
      name: "Barcode Bohong",
      barcode: "8991002101235",
      category: "Snack",
      currentPrice: 1000,
      stock: 1,
      unit: "pcs",
    });
    check(false, "5D: barcode digit-cek-salah harus ditolak createProduct");
  } catch (error) {
    check(/digit cek/i.test(appErrorOf(error).message), "5D: createProduct menolak barcode digit cek salah");
  }
  const csvParsed = parseProductCsv(
    "barcode,nama,kategori,harga,stok\n0089686010947,Indomie Goreng 85g,Makanan Instan,3500,24\n8991002101235,Barang Palsu,Snack,1000,1\n",
  );
  check(csvParsed.rows.length === 1 && csvParsed.errors.length === 1, "5D: impor CSV menerima barcode nyata & menolak yang tidak valid");

  // e) MIGRASI: produk warung ber-barcode sintetis pension → barcode
  //    dinolkan (produk TETAP ada, bisa dijual via pencarian nama).
  const retiredSample = [...RETIRED_BARCODES][0]!;
  const legacyProduct = await products.createProduct({
    name: "Warisan Seed 5C",
    barcode: retiredSample,
    category: "Snack",
    currentPrice: 2000,
    stock: 5,
    unit: "pcs",
  });
  const purgedCount = await products.purgeRetiredBarcodes();
  check(purgedCount >= 1, "5D migrasi: barcode sintetis pension dibersihkan");
  check(
    (await products.getProductByBarcode(retiredSample)) === null &&
      (await products.getProductById(legacyProduct.id)) !== null,
    "5D migrasi: produk TETAP ada, barcode-nya dinolkan (scan tak salah arah)",
  );

  // ================================================== TAHAP 6
  console.log("8) UJI PENERIMAAN TAHAP 6 — MESIN TRANSAKSI OFFLINE");
  // Perangkat uji §6: lokal murni, TANPA internet sama sekali.
  const store6 = new MemoryLocalStore();
  const repo6 = new GoogleSheetsStoreRepository(new NotConnectedGoogleApiClient());
  const engine6 = new QueueSyncEngine({ target: new NotConnectedSyncTarget(), localStore: store6, listenToNetworkEvents: false });
  await engine6.init();
  const products6 = new ProductService({ repository: repo6, localStore: store6, syncEngine: engine6 });
  const customers6 = new CustomerService({ repository: repo6, localStore: store6, syncEngine: engine6 });
  const transactions6 = new TransactionService({ localStore: store6, syncEngine: engine6, repository: repo6 });
  const sales6 = new SaleService(products6, transactions6, customers6, engine6);

  const pAqua = await products6.createProduct({ name: "Aqua 600ml", barcode: "8886008101053", category: "Minuman", currentPrice: 3000, stock: 100, unit: "pcs" });
  const pMie = await products6.createProduct({ name: "Indomie Goreng", barcode: "0089686010947", category: "Makanan Instan", currentPrice: 3500, stock: 100, unit: "pcs" });

  // TEST 1 — pencarian offline instan (lokal, tanpa jaringan).
  const found1 = await products6.searchProducts("aqua");
  check(found1.length === 1 && found1[0]!.name === "Aqua 600ml", "6.T1 CARI: produk langsung ketemu offline");

  // TEST 2 — lookup barcode offline.
  const found2 = await products6.getProductByBarcode("0089686010947");
  check(found2?.name === "Indomie Goreng", "6.T2 BARCODE: produk terdaftar dikenali offline");

  // TEST 3 — scan/barang sama 5× → SATU baris, jumlah 5 (logika lib/cart).
  let cart6: CartItem[] = [];
  for (let i = 0; i < 5; i += 1) cart6 = addToCart(cart6, pAqua, 1);
  check(cart6.length === 1 && cart6[0]!.quantity === 5, "6.T3 ULANG×5: satu baris, jumlah 5");

  // TEST 4 — 10 produk beda + TEST 5 — subtotal & total lokal.
  for (let i = 0; i < 10; i += 1) {
    cart6 = addToCart(cart6, await products6.createProduct({
      name: `Produk 6-${i}`, barcode: gs1Barcode(`89977700${String(i).padStart(4, "0")}`),
      category: "Snack", currentPrice: 2000 + i * 100, stock: 50, unit: "pcs",
    }), 1);
  }
  check(cart6.length === 11, "6.T4 10 PRODUK: semua terwakili di keranjang");
  const totalHarapan6 = 5 * 3000 + Array.from({ length: 10 }, (_, i) => 2000 + i * 100).reduce((a, b) => a + b, 0);
  check(cartTotal(cart6) === totalHarapan6, `6.T5 TOTAL: subtotal+total benar (${totalHarapan6})`);

  // Keranjang PERSISTEN (§6 interupsi/restart): simpan → muat ulang.
  await store6.setActiveCart(cart6);
  const restoredCart = await store6.getActiveCart();
  check(restoredCart.length === cart6.length && cartTotal(restoredCart) === totalHarapan6, "6.INTERRUPT: keranjang dipulihkan utuh dari perangkat (tahan restart)");

  // TEST 6 — CASH offline + status pembayaran PAID.
  const cash6 = await sales6.recordSale({ items: [{ productId: pAqua.id, quantity: 3 }], paymentType: "CASH" });
  check(cash6.transaction.paymentType === "CASH" && cash6.transaction.paymentStatus === "PAID", "6.T6 CASH: tersimpan offline, status LUNAS");

  // TEST 7 — BON offline: nama + items + total + status UNPAID.
  const bon6 = await sales6.recordSale({
    items: [{ productId: pMie.id, quantity: 2 }, { productId: pAqua.id, quantity: 1 }],
    paymentType: "BON", customerName: "Budi",
  });
  check(
    bon6.transaction.paymentStatus === "UNPAID" &&
      bon6.transaction.customer?.name === "Budi" &&
      bon6.transaction.items.length === 2 &&
      bon6.transaction.total === 2 * 3500 + 3000,
    "6.T7 BON: nama+produk+total tersimpan, status BELUM LUNAS",
  );

  // TEST 8 — stok berkurang PERSIS sesuai qty
  // (Aqua: 100 − 3 CASH − 1 BON = 96; Indomie: 100 − 2 BON = 98).
  check(
    (await products6.getProductById(pAqua.id))?.stock === 96 &&
      (await products6.getProductById(pMie.id))?.stock === 98,
    "6.T8 STOK: berkurang tepat (Aqua 100→96, Indomie 100→98)",
  );

  // TEST 9 — restart: layanan & engine BARU di atas store yang sama.
  const engine6b = new QueueSyncEngine({ target: new NotConnectedSyncTarget(), localStore: store6, listenToNetworkEvents: false });
  await engine6b.init();
  const transactions6b = new TransactionService({ localStore: store6, syncEngine: engine6b, repository: repo6 });
  const products6b = new ProductService({ repository: repo6, localStore: store6, syncEngine: engine6b });
  const after6b = await transactions6b.listTransactions();
  check(
    after6b.length === 2 && (await products6b.getProductById(pAqua.id))?.stock === 96,
    "6.T9 RESTART: transaksi & stok tetap ada setelah aplikasi dibuka ulang",
  );

  // TEST 10 — harga berubah → transaksi LAMA tetap pakai harga saat transaksi.
  await products6.updateProduct(pAqua.id, { currentPrice: 3500 });
  const hist10 = (await transactions6b.listTransactions()).find((t) => t.id === cash6.transaction.id)!;
  check(
    hist10.items[0]!.unitPrice === 3000 && hist10.total === 9000,
    "6.T10 HARGA: snapshot transaksi lama TIDAK ikut berubah (3000, bukan 3500)",
  );

  // TEST 11 — mulai online → putus di tengah → selesaikan (engine offline,
  // keranjang dipulihkan dari perangkat) → transaksi sah. Catatan: harga
  // Aqua sudah diubah T10 — transaksi ini memakai harga BARU (memang
  // begitu perilakunya); keranjang snack tak terpengaruh.
  const cart11 = restoredCart.filter((item) => item.productId !== pAqua.id);
  const total11 = cartTotal(cart11);
  const sale11 = await sales6.recordSale({
    items: cart11.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    paymentType: "CASH",
  });
  check(sale11.transaction.items.length === 10 && sale11.transaction.total === total11, "6.T11 PUTUS: transaksi selesai & benar setelah kehilangan jaringan");

  // TEST 12 — 20 transaksi beruntun offline: ID unik, jumlah utuh, stok & total akurat.
  const before12 = (await transactions6.listTransactions()).length;
  const ids12 = new Set<string>();
  let sum12 = 0;
  for (let i = 0; i < 20; i += 1) {
    const rapid = await sales6.recordSale({ items: [{ productId: pMie.id, quantity: 1 }], paymentType: "CASH" });
    ids12.add(rapid.transaction.id);
    sum12 += rapid.transaction.total;
  }
  const after12 = await transactions6.listTransactions();
  check(
    ids12.size === 20 && after12.length === before12 + 20 && sum12 === 20 * 3500,
    "6.T12 RAPID×20: ID unik semua, tanpa transaksi hilang, total akurat",
  );
  check((await products6.getProductById(pMie.id))?.stock === 100 - 2 - 20, "6.T12 RAPID×20: stok akurat tanpa korupsi (100−2−20)");

  // Rollback §6: stok kurang di tengah commit → transaksi TIDAK tersisa.
  try {
    await sales6.recordSale({ items: [{ productId: pAqua.id, quantity: 99999 }], paymentType: "CASH" });
    check(false, "6.ROLLBACK: stok kurang harus ditolak");
  } catch {
    const all6 = await transactions6.listTransactions();
    check(all6.length === after12.length, "6.ROLLBACK: transaksi gagal tidak tersisa (konsisten dgn stok)");
  }

  // ================================================== TAHAP 7
  console.log("9) UJI PENERIMAAN TAHAP 7 — DASHBOARD & LAPORAN (OFFLINE)");
  const store7 = new MemoryLocalStore();
  const repo7 = new GoogleSheetsStoreRepository(new NotConnectedGoogleApiClient());
  const engine7 = new QueueSyncEngine({ target: new NotConnectedSyncTarget(), localStore: store7, listenToNetworkEvents: false });
  await engine7.init();
  const products7 = new ProductService({ repository: repo7, localStore: store7, syncEngine: engine7 });
  const customers7 = new CustomerService({ repository: repo7, localStore: store7, syncEngine: engine7 });
  const transactions7 = new TransactionService({ localStore: store7, syncEngine: engine7, repository: repo7 });
  customers7.attachTransactionService(transactions7);

  const pAqua7 = await products7.createProduct({ name: "Aqua 600ml", barcode: "8886008101053", category: "Minuman", currentPrice: 3000, stock: 100, unit: "pcs" });
  const pMie7 = await products7.createProduct({ name: "Indomie Goreng", barcode: "0089686010947", category: "Makanan Instan", currentPrice: 3500, stock: 50, unit: "pcs" });
  const pKopi7 = await products7.createProduct({ name: "Kopi Kapal Api", barcode: gs1Barcode("8992388100017".slice(0, 12)), category: "Minuman", currentPrice: 2000, stock: 50, unit: "pcs" });
  const pGula7 = await products7.createProduct({ name: "Gula Pasir 1kg", barcode: gs1Barcode("899276111111"), category: "Sembako", currentPrice: 12000, stock: 10, unit: "pcs" });
  const pRokok7 = await products7.createProduct({ name: "Rokok A", barcode: gs1Barcode("899212222222"), category: "Rokok", currentPrice: 24000, stock: 30, unit: "pack" });

  // Zona waktu aplikasi = Asia/Jakarta: 1 Sep 2026 12.00 WIB.
  const now7 = new Date("2026-09-01T12:00:00+07:00");
  const iso = (wib: string) => `2026-${wib}:00+07:00` as const;

  // Transaksi HARI INI (1 Sep, WIB) — 5 CASH + 3 BON + 1 CASH dini hari.
  const mkTrx = (args: { ts: string; pay: "CASH" | "BON"; cust?: string; items: Array<[typeof pAqua7, number]> }) =>
    transactions7.createTransaction({
      timestamp: iso(args.ts),
      paymentType: args.pay,
      customer: args.cust ? { id: null, name: args.cust } : null,
      items: args.items.map(([product, qty]) => ({ productId: product.id, barcode: product.barcode, productName: product.name, quantity: qty, unitPrice: product.currentPrice })),
    });
  await mkTrx({ ts: "09-01T00:15", pay: "CASH", items: [[pMie7, 2]] }); // 7.000
  await mkTrx({ ts: "09-01T08:01", pay: "CASH", items: [[pAqua7, 2]] }); // 6.000
  await mkTrx({ ts: "09-01T08:20", pay: "CASH", items: [[pMie7, 1], [pKopi7, 3]] }); // 9.500
  await mkTrx({ ts: "09-01T09:00", pay: "CASH", items: [[pGula7, 1]] }); // 12.000
  await mkTrx({ ts: "09-01T09:30", pay: "CASH", items: [[pRokok7, 2]] }); // 48.000
  await mkTrx({ ts: "09-01T10:00", pay: "CASH", items: [[pKopi7, 1]] }); // 2.000
  await mkTrx({ ts: "09-01T10:30", pay: "BON", cust: "Budi", items: [[pAqua7, 10]] }); // 30.000
  await mkTrx({ ts: "09-01T11:00", pay: "BON", cust: "Andi", items: [[pMie7, 4]] }); // 14.000
  await mkTrx({ ts: "09-01T11:15", pay: "BON", cust: "Siti", items: [[pKopi7, 2], [pGula7, 1]] }); // 16.000
  // Kemarin (31 Agu 23.30 WIB) — HARUS di luar "hari ini", di dalam "minggu ini".
  await mkTrx({ ts: "08-31T23:30", pay: "CASH", items: [[pAqua7, 1]] }); // 3.000

  // TEST 1 — omzet cocok dengan hitungan manual.
  const sToday = summarizeTransactions(await transactions7.listTransactions(), "today", now7);
  check(sToday.omzet === 144500, "7.T1 OMZET: dashboard = hitungan manual (144.500)");
  // TEST 2 — jumlah CASH/BON.
  check(sToday.cashCount === 6 && sToday.bonCount === 3, "7.T2 CASH/BON: 6 tunai + 3 bon");
  // TEST 3 — rekonsiliasi eksak.
  check(sToday.cashTotal + sToday.bonTotal === sToday.omzet, "7.T3 REKONSILIASI: tunai 84.500 + bon 60.000 = omzet 144.500");
  // TEST 7 — filter tanggal + batas zona waktu (23.30 kemarin di luar hari ini).
  check(
    sToday.transactionCount === 9 && summarizeTransactions(await transactions7.listTransactions(), "week", now7).omzet === 147500,
    "7.T7 TANGGAL: hanya transaksi hari ini (WIB); minggu ini ikut menghitung kemarin",
  );
  // TEST 4 — peringkat produk dari item transaksi.
  const top7 = topProducts(await transactions7.listTransactions(), "today", 3, now7);
  check(
    top7.length === 3 && top7[0]!.name === "Aqua 600ml" && top7[0]!.quantity === 12 &&
      top7[1]!.name === "Indomie Goreng" && top7[1]!.quantity === 7 && top7[2]!.quantity === 6,
    "7.T4 PERINGKAT: Aqua 12 → Indomie 7 → Kopi 6",
  );
  // Jarang terjual — aturan deterministik (terjual ≤ 2).
  const slow7 = slowMovingProducts(await transactions7.listTransactions(), await products7.listProducts(), "today", {}, now7);
  check(
    slow7.some((i) => i.name === "Rokok A" && i.quantity === 2) &&
      slow7.some((i) => i.name === "Gula Pasir 1kg" && i.quantity === 2) &&
      !slow7.some((i) => i.name === "Aqua 600ml"),
    "7.JARANG: aturan deterministik terjual≤2 (Rokok & Gula masuk, Aqua tidak)",
  );
  // TEST 8 — harga snapshot: ubah harga → lama tetap harga A.
  await products7.updateProduct(pAqua7.id, { currentPrice: 3500 });
  const sAfter = summarizeTransactions(await transactions7.listTransactions(), "today", now7);
  const topAfter = topProducts(await transactions7.listTransactions(), "today", 1, now7);
  check(
    sAfter.omzet === 144500 && topAfter[0]!.revenue === 36000,
    "7.T8 SNAPSHOT: harga jadi 3.500 → laporan lama tetap 3.000 (12×3.000)",
  );

  // BON dashboard + stok + pelunasan (recordSale nyata, waktu sesungguhnya).
  const sales7 = new SaleService(products7, transactions7, customers7, engine7);
  await sales7.recordSale({ items: [{ productId: pAqua7.id, quantity: 3 }], paymentType: "BON", customerName: "Budi" });
  await sales7.recordSale({ items: [{ productId: pKopi7.id, quantity: 2 }], paymentType: "BON", customerName: "Andi" });
  await sales7.recordSale({ items: [{ productId: pGula7.id, quantity: 1 }], paymentType: "BON", customerName: "Siti" });

  // TEST 6 — cari pelanggan bon secara lokal.
  const allBon7 = bonCustomerSummaries(await customers7.listCustomers(), await transactions7.listTransactions());
  const budiOnly = allBon7.filter((c) => c.name.toLowerCase().includes("budi"));
  check(
    allBon7.length === 3 && budiOnly.length === 1 && budiOnly[0]!.name === "Budi" && budiOnly[0]!.unpaidTotal === 10500,
    "7.T6 BON CARI: \"Budi\" → hanya Budi (sisa 10.500, 1 bon)",
  );
  // TEST 5 — stok dashboard = basis data produk lokal.
  await products7.setLowStockThreshold(pGula7.id, 10); // 10 − 1 terjual = 9 ≤ 10 → menipis
  const stock7 = stockOverview(await products7.listProducts(), await products7.getLowStockThresholds());
  const aquaStock = stock7.find((i) => i.productId === pAqua7.id)!;
  const gulaStock = stock7.find((i) => i.productId === pGula7.id)!;
  const dbAqua = (await products7.getProductById(pAqua7.id))!.stock;
  check(
    aquaStock.stock === dbAqua && dbAqua === 97 && aquaStock.lowStock === false &&
      gulaStock.lowStock === true,
    "7.T5 STOK: dashboard = database (Aqua 97); penanda Menipis hanya bila batas ditetapkan",
  );

  // Pelunasan: piutang habis → bon ditandai LUNAS + tidak dihitung sebagai omzet.
  const budi7 = (await customers7.listCustomers()).find((c) => c.name === "Budi")!;
  await customers7.settleBon(budi7.id, 10500); // pelunasan PENUH
  const trxs7 = await transactions7.listTransactions();
  const budiPaid = trxs7.filter((t) => t.customer?.id === budi7.id && t.paymentType === "BON");
  const settle7 = summarizeTransactions(trxs7, "today");
  check(
    budiPaid.length === 1 && budiPaid[0]!.paymentStatus === "PAID" &&
      settle7.settlementTotal === 10500 && settle7.cashTotal + settle7.bonTotal === settle7.omzet,
    "7.PELUNASAN: bon Budi LUNAS; pelunasan 10.500 bukan omzet; rekonsiliasi tetap eksak",
  );
  const bonAfter7 = bonCustomerSummaries(await customers7.listCustomers(), trxs7);
  check(bonAfter7.length === 2 && !bonAfter7.some((c) => c.name === "Budi"), "7.PELUNASAN: Budi hilang dari daftar bon aktif");

  // TEST 9 — offline penuh: engine TIDAK terhubung, laporan tetap lengkap.
  // Hanya transaksi berstempel eksplisit 1 Sep (Set A) — pisahkan dari
  // transaksi pelunasan/bon sesungguhnya agar asersi eksak deterministik.
  const setA7 = trxs7.filter((t) => t.timestamp.endsWith("+07:00"));
  const doc7 = buildReportDocument({
    transactions: setA7, products: await products7.listProducts(),
    customers: await customers7.listCustomers(), range: "today", now: now7,
  });
  check(
    doc7.summary.omzet === 144500 && doc7.breakdown.length >= 7 && doc7.topProducts.length > 0 &&
      (await engine7.getQueue()).length > 0,
    "7.T9 OFFLINE: dokumen laporan utuh tanpa jaringan (antrean sync tetap tertahan)",
  );

  // TEST 10 — ekspor CSV & PDF (dirakit lokal, isi terverifikasi).
  const csv7 = reportToCsv(doc7);
  check(
    csv7.startsWith("Laporan Penjualan Warungku") &&
      csv7.includes("Omzet;144500") && csv7.includes("Tunai (CASH);84500") &&
      csv7.includes("Bon (BON);60000") && csv7.includes("Aqua 600ml;12;36000") &&
      csv7.includes("Rokok A;2"),
    "7.T10 CSV: ringkasan + peringkat + jarang terjual sesuai periode terpilih",
  );
  const trxCsv7 = transactionsToCsv(trxs7);
  check(trxCsv7.includes("trx_") && trxCsv7.split("\r\n").length === trxs7.length + 1, "7.T10 CSV: daftar transaksi = jumlah baris data");
  const pdf7 = reportToPdf(doc7);
  const pdfText7 = Buffer.from(pdf7).toString("latin1");
  const startxref7 = Number(/startxref\s+(\d+)/.exec(pdfText7)?.[1] ?? "0");
  check(
    pdf7.length > 1500 && pdfText7.startsWith("%PDF") &&
      pdfText7.includes("LAPORAN PENJUALAN WARUNGKU") &&
      pdfText7.includes("PRODUK TERLARIS") && pdfText7.includes("BON PELANGGAN") &&
      startxref7 > 0 && startxref7 < pdf7.length,
    "7.T10 PDF: struktur valid & memuat ringkasan, terlaris, bon",
  );

  // PERFORMANCE — dataset besar: 720 produk, 520 transaksi, 2.080 item.
  // Ditulis LANGSUNG ke store lokal (tanpa antrean sinkron) agar yang
  // terukur murni kinerja LAPORAN, bukan backoff jaringan.
  const storeP = new MemoryLocalStore();
  const catalogP: Product[] = Array.from({ length: 720 }, (_, i) => ({
    id: `prd_perf_${i}`,
    barcode: gs1Barcode(`89977${String(i).padStart(7, "0")}`),
    name: `Produk Uji ${i}`,
    currentPrice: 1500,
    costPrice: null,
    stock: 100,
    unit: "pcs" as const,
    category: "Uji",
    isActive: true,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  }));
  await storeP.setCachedProducts(catalogP);
  const trxsP: Transaction[] = Array.from({ length: 520 }, (_, i) => {
    const day = 3 + (i % 28); // 3–30 Agustus 2026 (WIB)
    const items = [0, 1, 2, 3].map((k) => {
      const product = catalogP[(i * 4 + k) % 720]!;
      return {
        transactionId: `trx_perf_${i}`,
        productId: product.id,
        barcode: product.barcode,
        productName: product.name,
        quantity: 2,
        unitPrice: 1500,
        subtotal: 3000,
      };
    });
    return {
      id: `trx_perf_${i}`,
      timestamp: `2026-08-${String(day).padStart(2, "0")}T1${i % 8}:00:00+07:00`,
      customer: i % 4 === 0 ? { id: null, name: `Pelanggan ${i % 13}` } : null,
      paymentType: i % 4 === 0 ? "BON" : "CASH",
      total: 12000,
      status: "COMPLETED" as const,
      paymentStatus: i % 4 === 0 ? ("UNPAID" as const) : ("PAID" as const),
      items,
      note: null,
      syncedAt: null,
    };
  });
  for (const trx of trxsP) await storeP.upsertTransaction(trx);
  const nowP = new Date("2026-08-31T12:00:00+07:00");
  const t0Perf = Date.now();
  const docP = buildReportDocument({
    transactions: trxsP, products: catalogP,
    customers: [], range: "month", now: nowP,
    stockThresholds: { prd_perf_1: 5 },
  });
  const summarizeMs = Date.now() - t0Perf;
  check(
    docP.summary.transactionCount === 520 && docP.summary.omzet === 6240000 &&
      docP.summary.cashTotal + docP.summary.bonTotal === docP.summary.omzet,
    "7.PERF: 520 transaksi / 2.080 item → omzet 6.240.000 eksak",
  );
  check(summarizeMs < 1500, `7.PERF: dashboard lengkap < 1,5 dtk (aktual ${summarizeMs} ms, 720 produk)`);

  if (failures > 0) {
    console.error(`\nGAGAL: ${failures} pemeriksaan tidak lolos.`);
    process.exit(1);
  }
  console.log("\nSemua pemeriksaan lolos — alur transaksi Tahap 3 + 5A + 5B + 5D + 6 + 7 (dashboard & laporan offline) berfungsi.");
  process.exit(0); // timer backoff engine sinkron tidak menahan proses uji
}

main().catch((error: unknown) => {
  console.error("Uji asap gagal dijalankan:", error);
  process.exit(1);
});
