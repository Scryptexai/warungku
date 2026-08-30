import type {
  CreateTransactionInput,
  Transaction,
  TransactionItem,
} from "@/domain";
import { PAYMENT_TYPES } from "@/domain";
import type { StoreDataRepository } from "@/data/store-data-repository";
import type { LocalStore } from "@/data/local/local-store";
import type { SyncEngine } from "@/sync/sync-engine";
import { nowISO } from "@/lib/datetime";
import { ValidationError } from "@/lib/errors";
import { createPrefixedId } from "@/lib/id";

export interface TransactionServiceDeps {
  localStore: LocalStore;
  syncEngine: SyncEngine;
  /** Dibutuhkan untuk menarik (backup) transaksi dari Google Sheets. */
  repository: StoreDataRepository;
}

/**
 * Logika aplikasi Transaksi — OFFLINE-FIRST:
 *
 *   DATABASE UTAMA = perangkat (localStorage).
 *   BACA  → selalu dari perangkat (riwayat lengkap, tanpa internet).
 *   TULIS → simpan perangkat (sync_status: PENDING) → antre → Google Sheets.
 *   SETELAH TERKIRIM → transaksi DITANDAI synced (TIDAK dihapus dari
 *   perangkat) — Google Sheets hanyalah CADANGAN, bukan pengganti.
 *
 * Menarik data Sheets → perangkat (merge by id; transaksi lokal yang masih
 * PENDING selalu menang agar tidak tertimpa sebelum terkirim).
 */
export class TransactionService {
  private readonly localStore: LocalStore;
  private readonly syncEngine: SyncEngine;
  private readonly repository: StoreDataRepository;

  constructor(deps: TransactionServiceDeps) {
    this.localStore = deps.localStore;
    this.syncEngine = deps.syncEngine;
    this.repository = deps.repository;
  }

  /**
   * Riwayat transaksi LENGKAP — dibaca dari database perangkat (utama).
   * Berfungsi 100% tanpa internet.
   */
  async listTransactions(): Promise<Transaction[]> {
    const all = await this.localStore.getAllTransactions();
    return [...all].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
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

    // Database perangkat = UTAMA: simpan di sini dulu (PENDING), lalu antre.
    await this.localStore.upsertTransaction(transaction);
    await this.syncEngine.enqueue({
      id: createPrefixedId("op"),
      kind: "CREATE",
      entity: "TRANSACTION",
      payload: transaction,
      createdAt: timestamp,
    });
    return transaction;
  }

  /**
   * Setelah Google Sheets menerima transaksi: TANDAI synced, JANGAN hapus.
   * Riwayat di perangkat tetap lengkap — Sheets hanyalah cadangan.
   */
  async markSynced(transactionId: string): Promise<void> {
    await this.localStore.markTransactionSynced(transactionId, nowISO());
  }

  /**
   * Tarik transaksi dari Google Sheets ke perangkat (saat pertama online /
   * sinkronkan manual). Merge berdasarkan ID:
   * - transaksi lokal yang masih PENDING selalu menang (belum terkirim),
   * - transaksi yang hanya ada di Sheets diunduh (ditandai synced),
   * - keduanya sudah synced → ambil yang paling baru.
   * Mengembalikan jumlah transaksi hasil gabungan.
   */
  async pullFromSheets(): Promise<number> {
    const remote = await this.repository.getTransactions();
    if (remote.length === 0) return (await this.localStore.getAllTransactions()).length;

    const local = await this.localStore.getAllTransactions();
    const byId = new Map(local.map((item) => [item.id, item]));
    let changed = false;

    for (const remoteItem of remote) {
      const localItem = byId.get(remoteItem.id);
      if (localItem && localItem.syncedAt === null) continue; // pending menang
      if (localItem && (localItem.syncedAt ?? "") >= (remoteItem.syncedAt ?? "")) {
        continue; // lokal sudah lebih baru
      }
      const merged: Transaction = {
        ...remoteItem,
        syncedAt: remoteItem.syncedAt ?? remoteItem.timestamp,
      };
      byId.set(remoteItem.id, merged);
      changed = true;
    }

    if (changed) {
      const merged = [...byId.values()].sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp),
      );
      // Tulis lewat upsert per item agar implementasi store bebas memilih
      // struktur penyimpanan.
      await this.localStore.replaceAllTransactions(merged);
    }
    return (await this.localStore.getAllTransactions()).length;
  }
}
