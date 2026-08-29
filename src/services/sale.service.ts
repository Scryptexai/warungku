import type { PaymentType, Product, SyncRunSummary, Transaction } from "@/domain";
import type { SyncEngine } from "@/sync/sync-engine";
import { ValidationError } from "@/lib/errors";
import type { CustomerService } from "./customer.service";
import type { ProductService } from "./product.service";
import type { TransactionService } from "./transaction.service";

/** Item yang dikirim dari keranjang kasir ke layanan penjualan. */
export interface SaleItemInput {
  productId: string;
  quantity: number;
}

export interface RecordSaleInput {
  items: SaleItemInput[];
  paymentType: PaymentType;
  /** Wajib untuk BON — nama pembeli. */
  customerName?: string;
}

export interface RecordSaleResult {
  transaction: Transaction;
  /** Hasil percobaan kirim ke Google Sheets (bisa gagal → tetap di antrean). */
  sync: SyncRunSummary;
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
      productMap.set(item.productId, product);
    }

    // Pelanggan bon: ambil / buat dari nama.
    const customerRecord = isBon
      ? await this.customers.getOrCreateCustomerByName(customerName)
      : null;

    // 1) Simpan transaksi (snapshot nama & harga saat ini).
    const transaction = await this.transactions.createTransaction({
      paymentType: input.paymentType,
      customer: customerRecord
        ? { id: customerRecord.id, name: customerRecord.name }
        : null,
      items: input.items.map((item) => {
        const product = productMap.get(item.productId)!;
        return {
          productId: product.id,
          barcode: product.barcode,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.currentPrice,
        };
      }),
    });

    // 2) Kurangi stok: stok - terjual = stok baru (konsisten dengan transaksi).
    const stockUpdates: RecordSaleResult["stockUpdates"] = [];
    for (const item of input.items) {
      const product = productMap.get(item.productId)!;
      const newStock = Math.max(0, Math.round(product.stock - item.quantity));
      const updated = await this.products.updateProduct(product.id, { stock: newStock });
      stockUpdates.push({ product: updated, newStock });
    }

    // 3) Bon → tambah saldo bon pelanggan (total bon = total transaksi).
    if (customerRecord) {
      await this.customers.addToOutstanding(customerRecord.id, transaction.total);
    }

    // 4) Coba kirim sekarang; gagal → tetap di antrean & dicoba ulang.
    const sync = await this.syncEngine.syncNow();

    return { transaction, sync, stockUpdates };
  }
}
