import type { PaymentType, Product, SyncState, Transaction } from "@/domain";
import type { SyncEngine } from "@/sync/sync-engine";
import { ValidationError } from "@/lib/errors";
import type { CustomerService } from "./customer.service";
import type { ProductService } from "./product.service";
import type { TransactionService } from "./transaction.service";

/**
 * Item yang dikirim dari keranjang kasir ke layanan penjualan.
 * `unitPrice` opsional = harga khusus transaksi ini (§5A): bila diisi,
 * nilainya dipakai sebagai snapshot harga transaksi dan TIDAK mengubah
 * harga master produk. Kosong → pakai harga master terbaru.
 */
export interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface RecordSaleInput {
  items: SaleItemInput[];
  paymentType: PaymentType;
  /** Wajib untuk BON — nama pembeli. */
  customerName?: string;
}

export interface RecordSaleResult {
  transaction: Transaction;
  /**
   * §5B: status sinkron SESAAT SETELAH commit lokal. Pengiriman ke Google
   * Sheets berjalan di latar belakang dan TIDAK menunda keberhasilan
   * transaksi — commit lokal adalah source of truth.
   */
  sync: { state: SyncState; queuedCount: number };
  /** Stok produk setelah pengurangan. */
  stockUpdates: Array<{ product: Product; newStock: number }>;
}

/**
 * Layanan penjualan — ORKESTRATOR ALUR TAHAP 3:
 *
 *   SCAN → PRODUK DIKENALI → JUMLAH → TUNAI/BON → SIMPAN
 *
 * Jaminan:
 * - Harga diambil dari data produk TERBARU saat disimpan; transaksi lama
 *   menyimpan snapshot harga dan tidak pernah berubah (§9).
 * - Stok berkurang konsisten dengan transaksi: stok - terjual = stok baru (§7).
 * - Transaksi BON wajib bernama pembeli; pelanggan dicatat (§5).
 * - Transaksi tersimpan lokal dulu → antrean → Google Sheets; bila gagal
 *   kirim, data tetap aman dan dicoba ulang (§11).
 * - Satu transaksi = satu ID; pengiriman ulang tidak menduplikasi baris
 *   di Sheets (idempotent by transaction_id).
 */
export class SaleService {
  constructor(
    private readonly products: ProductService,
    private readonly transactions: TransactionService,
    private readonly customers: CustomerService,
    private readonly syncEngine: SyncEngine,
  ) {}

  async recordSale(input: RecordSaleInput): Promise<RecordSaleResult> {
    if (!input.items || input.items.length === 0) {
      throw new ValidationError("Transaksi wajib memiliki minimal satu item.", {
        field: "items",
      });
    }
    const isBon = input.paymentType === "BON";
    const customerName = input.customerName?.trim() ?? "";
    if (isBon && !customerName) {
      throw new ValidationError("Transaksi bon wajib mengisi nama pembeli.", {
        field: "customerName",
      });
    }

    // Validasi produk & ambil harga terbaru dari database produk.
    const productMap = new Map<string, Product>();
    for (const item of input.items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new ValidationError("Jumlah item harus lebih dari 0.", { field: "items" });
      }
      const product = await this.products.getProductById(item.productId);
      if (!product) {
        throw new ValidationError(
          "Ada barang di keranjang yang sudah tidak ada di daftar produk.",
          { field: "items" },
        );
      }
      // Stok harus mencukupi — cek SEBELUM menyimpan agar transaksi gagal
      // tidak pernah memotong stok (§11 & §14).
      if (item.quantity > product.stock) {
        throw new ValidationError(
          `Stok ${product.name} tidak cukup. Sisa ${product.stock} ${product.unit}.`,
          { field: "items" },
        );
      }
      productMap.set(item.productId, product);
    }

    // Pelanggan bon: ambil / buat dari nama.
    const customerRecord = isBon
      ? await this.customers.getOrCreateCustomerByName(customerName)
      : null;

    // ============================================================
    // §6 COMMIT ATOMIK: transaksi + item + stok konsisten atau
    // dikembalikan. Urutan: (1) tulis transaksi (satu tulisan koleksi,
    //     item ikut di dalamnya), (2) kurangi stok SEMUA produk dalam
    //     SATU tulisan koleksi. Bila (2) gagal → transaksi di-rollback.
    //     Antrean sinkron baru diisi SETELAH keduanya aman.
    // ============================================================
    const transaction = await this.transactions.createTransaction(
      {
        paymentType: input.paymentType,
        customer: customerRecord
          ? { id: customerRecord.id, name: customerRecord.name }
          : null,
        items: input.items.map((item) => {
          const product = productMap.get(item.productId)!;
          const override =
            item.unitPrice !== undefined &&
            Number.isFinite(item.unitPrice) &&
            item.unitPrice >= 0
              ? Math.round(item.unitPrice)
              : null;
          return {
            productId: product.id,
            barcode: product.barcode,
            productName: product.name,
            quantity: item.quantity,
            // Harga master tetap menjadi default; harga khusus transaksi
            // hanya menjadi snapshot di transaksi ini (§5A & §9).
            unitPrice: override ?? product.currentPrice,
          };
        }),
      },
      { deferEnqueue: true }, // antre setelah stok aman (§6)
    );

    let stockUpdates: RecordSaleResult["stockUpdates"];
    try {
      stockUpdates = await this.products.reduceStockOnce(input.items);
    } catch (error) {
      // Rollback: transaksi batal, stok tidak tersentuh (satu tulisan
      // koleksi = gagal sebelum efek), kasir tetap memegang bon.
      await this.transactions.removeLocalTransaction(transaction.id);
      throw error;
    }
    // Commit lokal selesai & konsisten → baru antre sinkron (latar belakang).
    await this.transactions.enqueueTransactionOp(transaction);

    // 3) Bon → tambah saldo bon pelanggan (total bon = total transaksi).
    if (customerRecord) {
      await this.customers.addToOutstanding(customerRecord.id, transaction.total);
    }

    // 4) §5B: kirim di LATAR BELAKANG — transaksi SUDAH berhasil pada
    //    langkah 1–3 (commit lokal). Respons Google Sheets tidak pernah
    //    menentukan keberhasilan transaksi; gagal kirim → tetap di antrean
    //    & dicoba ulang otomatis saat online.
    void this.syncEngine.syncNow();
    const status = this.syncEngine.getStatus();

    return {
      transaction,
      sync: { state: status.state, queuedCount: status.queuedCount },
      stockUpdates,
    };
  }
}
