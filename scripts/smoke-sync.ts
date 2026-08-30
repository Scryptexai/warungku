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
    barcode: "8991002105678",
    category: "Kebutuhan",
    currentPrice: 18000,
    stock: 10,
    unit: "pack",
  });
  check((await products.searchProducts("indomie")).length === 1, "cari nama → ketemu");
  check((await products.getProductByBarcode("8991002105678"))?.name === "Gula 1kg", "cari barcode → ketemu");
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
    barcode: "8991112223334",
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
      barcode: `89955500${String(i).padStart(5, "0")}`,
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

  if (failures > 0) {
    console.error(`\nGAGAL: ${failures} pemeriksaan tidak lolos.`);
    process.exit(1);
  }
  console.log("\nSemua pemeriksaan lolos — alur transaksi Tahap 3 + 5A + 5B berfungsi (lokal + Google Sheets).");
}

main().catch((error: unknown) => {
  console.error("Uji asap gagal dijalankan:", error);
  process.exit(1);
});
