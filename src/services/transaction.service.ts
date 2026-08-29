import type {
  CreateTransactionInput,
  Transaction,
  TransactionItem,
} from "@/domain";
import { PAYMENT_TYPES } from "@/domain";
import type { LocalStore } from "@/data/local/local-store";
import type { SyncEngine } from "@/sync/sync-engine";
import { nowISO } from "@/lib/datetime";
import { ValidationError } from "@/lib/errors";
import { createPrefixedId } from "@/lib/id";

export interface TransactionServiceDeps {
  localStore: LocalStore;
  syncEngine: SyncEngine;
}

/**
 * Logika aplikasi Transaksi.
 *
 * STATUS TAHAP 1: pencatatan transaksi pada tingkat layanan sudah berfungsi
 * (validasi → simpan lokal → antre sinkron) sebagai pembuktian arsitektur
 * offline-first. Alur POS lengkap (keranjang, pembayaran, potong stok, bon)
 * dibangun pada TAHAP 4 di atas layanan ini.
 */
export class TransactionService {
  private readonly localStore: LocalStore;
  private readonly syncEngine: SyncEngine;

  constructor(deps: TransactionServiceDeps) {
    this.localStore = deps.localStore;
    this.syncEngine = deps.syncEngine;
  }

  /**
   * Daftar transaksi. Tahap 1 hanya menampilkan transaksi tertunda lokal;
   * Tahap 2+ menggabungkannya dengan data dari Google Sheets.
   */
  async listTransactions(): Promise<Transaction[]> {
    const pending = await this.localStore.getPendingTransactions();
    return [...pending].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    return this.localStore.getPendingTransactions();
  }

  /** Mencatat satu transaksi: validasi → simpan lokal → antre sinkron. */
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    if (!PAYMENT_TYPES.includes(input.paymentType)) {
      throw new ValidationError("Jenis pembayaran harus CASH atau BON.", {
        field: "paymentType",
      });
    }

    const items = input.items ?? [];
    if (items.length === 0) {
      throw new ValidationError("Transaksi wajib memiliki minimal satu item.", {
        field: "items",
      });
    }
    for (const item of items) {
      if (!item.productId || !item.productName?.trim()) {
        throw new ValidationError("Setiap item harus memiliki produk.", {
          field: "items",
        });
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new ValidationError(
          `Jumlah untuk "${item.productName}" harus lebih dari 0.`,
          { field: "items" },
        );
      }
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        throw new ValidationError(`Harga untuk "${item.productName}" tidak valid.`, {
          field: "items",
        });
      }
    }

    const isBon = input.paymentType === "BON";
    if (isBon && !input.customer?.name?.trim()) {
      throw new ValidationError("Transaksi bon wajib memilih pelanggan.", {
        field: "customer",
      });
    }

    const timestamp = input.timestamp ?? nowISO();
    const transactionId = createPrefixedId("trx");

    // Dukung satuan pecahan (kg/liter) hingga 3 desimal; rupiah selalu bulat.
    const transactionItems: TransactionItem[] = items.map((item) => {
      const quantity = Math.round(item.quantity * 1000) / 1000;
      const unitPrice = Math.round(item.unitPrice);
      return {
        transactionId,
        productId: item.productId,
        barcode: item.barcode?.trim() || null,
        productName: item.productName.trim(),
        quantity,
        unitPrice,
        subtotal: Math.round(quantity * unitPrice),
      };
    });
    const total = transactionItems.reduce((sum, item) => sum + item.subtotal, 0);

    const transaction: Transaction = {
      id: transactionId,
      timestamp,
      customer: input.customer
        ? { id: input.customer.id ?? null, name: input.customer.name.trim() }
        : null,
      paymentType: input.paymentType,
      total,
      status: "COMPLETED",
      items: transactionItems,
      note: input.note?.trim() || null,
      syncedAt: null,
    };

    await this.localStore.addPendingTransaction(transaction);
    await this.syncEngine.enqueue({
      id: createPrefixedId("op"),
      kind: "CREATE",
      entity: "TRANSACTION",
      payload: transaction,
      createdAt: timestamp,
    });
    return transaction;
  }

  /** Dipanggil (Tahap 2) setelah operasi sinkron TRANSAKSI diterima remote. */
  async markSynced(transactionId: string): Promise<void> {
    await this.localStore.removePendingTransaction(transactionId);
  }
}
