import type {
  SyncOperation,
  SyncQueueItem,
  SyncRunSummary,
  SyncState,
  SyncStatusSnapshot,
} from "@/domain";
import { DEFAULT_MAX_SYNC_OPERATIONS_PER_RUN } from "@/config/app";
import type { LocalStore } from "@/data/local/local-store";
import { nowISO } from "@/lib/datetime";
import { toAppError } from "@/lib/errors";
import { generateId } from "@/lib/id";
import type { SyncEngine, SyncStatusListener, SyncTarget } from "./sync-engine";

export interface QueueSyncEngineOptions {
  /** Tujuan remote operasi (Tahap 1: NotConnectedSyncTarget). */
  target: SyncTarget;
  /** Penyimpanan lokal untuk antrean & status. */
  localStore: LocalStore;
  /** Batas operasi per satu sesi kirim. */
  maxOperationsPerRun?: number;
  /** Pasang pendengar online/offline peramban (default: true). */
  listenToNetworkEvents?: boolean;
  /**
   * Dipanggil setiap kali SATU operasi berhasil diterima remote —
   * dipakai untuk menandai sync_status entitas lokal (mis. transaksi
   * PENDING → SYNCED) tanpa membuat engine mengenal layanan aplikasi.
   */
  onOperationSynced?: (operation: SyncOperation) => void | Promise<void>;
}

const DEFAULT_SNAPSHOT: Omit<SyncStatusSnapshot, "updatedAt"> = {
  state: "IDLE",
  queuedCount: 0,
  lastSyncedAt: null,
  lastError: null,
};

/**
 * Engine antrean sinkronisasi — jantung arsitektur offline-first Warungku.
 *
 * Jaminan utama:
 * 1. Operasi yang masuk SELALU ditulis dulu ke penyimpanan lokal
 *    (never lose data) sebelum mencoba dikirim.
 * 2. Kegagalan kirim (jaringan/autentikasi) TIDAK menghapus operasi —
 *    status kembali PENDING, jumlah percobaan bertambah, dan operasi
 *    dikirim ulang saat syncNow berikutnya (termasuk otomatis saat
 *    peramban kembali online).
 * 3. Operasi yang berhasil dihapus dari antrean.
 */
export class QueueSyncEngine implements SyncEngine {
  private readonly target: SyncTarget;
  private readonly localStore: LocalStore;
  private readonly maxOperationsPerRun: number;
  private readonly listenToNetworkEvents: boolean;
  private readonly onOperationSynced:
    | ((operation: SyncOperation) => void | Promise<void>)
    | null;

  private listeners = new Set<SyncStatusListener>();
  private snapshot: SyncStatusSnapshot = { ...DEFAULT_SNAPSHOT, updatedAt: nowISO() };
  private runChain: Promise<SyncRunSummary> | null = null;
  private initialized = false;
  private detachNetworkEvents: (() => void) | null = null;

  constructor(options: QueueSyncEngineOptions) {
    this.target = options.target;
    this.localStore = options.localStore;
    this.maxOperationsPerRun =
      options.maxOperationsPerRun ?? DEFAULT_MAX_SYNC_OPERATIONS_PER_RUN;
    this.listenToNetworkEvents = options.listenToNetworkEvents ?? true;
    this.onOperationSynced = options.onOperationSynced ?? null;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const [queue, persistedStatus] = await Promise.all([
      this.localStore.getSyncQueue(),
      this.localStore.getSyncStatus(),
    ]);

    // Pemulihan setelah proses mati di tengah pengiriman: item IN_PROGRESS
    // dikembalikan ke PENDING agar pasti dicoba ulang.
    for (const item of queue) {
      if (item.status === "IN_PROGRESS") {
        await this.localStore.replaceSyncItem({
          ...item,
          status: "PENDING",
          updatedAt: nowISO(),
        });
      }
    }

    const base = persistedStatus ?? { ...DEFAULT_SNAPSHOT };
    const state: SyncState = queue.length > 0 ? "WAITING" : "IDLE";
    this.snapshot = { ...base, state, queuedCount: queue.length, updatedAt: nowISO() };
    this.emit();

    this.attachNetworkListeners();
  }

  private attachNetworkListeners(): void {
    if (!this.listenToNetworkEvents || typeof window === "undefined") return;

    const handleOnline = (): void => {
      void this.syncNow();
    };
    const handleOffline = (): void => {
      this.update({ state: "WAITING" });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    this.detachNetworkEvents = () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }

  getStatus(): SyncStatusSnapshot {
    return this.snapshot;
  }

  subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async getQueue(): Promise<SyncQueueItem[]> {
    return this.localStore.getSyncQueue();
  }

  async enqueue(operation: SyncOperation): Promise<SyncQueueItem> {
    const item: SyncQueueItem = {
      id: generateId(),
      operation,
      status: "PENDING",
      attempts: 0,
      lastError: null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    // 1) Selalu persisten dulu — data tidak boleh hilang.
    await this.localStore.enqueueSyncItem(item);
    this.update({
      state: this.snapshot.state === "SYNCING" ? "SYNCING" : "WAITING",
      queuedCount: this.snapshot.queuedCount + 1,
    });

    // 2) Best-effort kirim segera; kegagalan biar ditangani syncNow berikut.
    void this.syncNow();

    return item;
  }

  async syncNow(): Promise<SyncRunSummary> {
    // Serialkan sesi: setiap panggilan menunggu sesi sebelumnya selesai,
    // lalu menjalankan sesinya sendiri — sehingga ringkasan yang dikembalikan
    // selalu mencerminkan antrean SAMPAI titik waktu pemanggilan.
    const previous = this.runChain;
    const run = (previous ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => this.executeRun());
    this.runChain = run;
    run
      .catch(() => undefined)
      .then(() => {
        if (this.runChain === run) this.runChain = null;
      })
      .catch(() => undefined);
    return run;
  }

  private async executeRun(): Promise<SyncRunSummary> {
    this.update({ state: "SYNCING" });

    // Target belum siap (belum terhubung Google / offline)? Operasi tetap
    // menunggu di antrean — bukan error.
    let targetReady = false;
    try {
      targetReady = await this.target.isReady();
    } catch (error) {
      console.warn("[warungku] Pemeriksaan kesiapan target sinkron gagal.", error);
      targetReady = false;
    }

    if (!targetReady) {
      this.update({ state: "WAITING", lastError: null });
      return {
        attempted: 0,
        succeeded: 0,
        failed: 0,
        skipped: true,
        targetReady: false,
        finishedAt: nowISO(),
      };
    }

    const queue = (await this.localStore.getSyncQueue())
      .filter((item) => item.status === "PENDING" || item.status === "FAILED")
      .slice(0, this.maxOperationsPerRun);

    let succeeded = 0;
    let failed = 0;
    let lastError: string | null = null;

    for (const item of queue) {
      await this.localStore.replaceSyncItem({
        ...item,
        status: "IN_PROGRESS",
        updatedAt: nowISO(),
      });

      try {
        await this.target.push(item.operation);
        // Sukses → keluar dari antrean.
        await this.localStore.removeSyncItem(item.id);
        succeeded += 1;
        // Tandai sync_status entitas lokal (transaksi → synced).
        if (this.onOperationSynced) {
          try {
            await this.onOperationSynced(item.operation);
          } catch (hookError) {
            // Gagal menandai TIDAK menggagalkan sinkronisasi — data aman di
            // Sheets; penandaan menyusul pada operasi berikutnya.
            console.warn(
              "[warungku] Gagal menandai operasi sebagai tersinkron.",
              hookError,
            );
          }
        }
      } catch (error) {
        // Gagal → TETAP di antrean, tunggu percobaan berikutnya.
        const appError = toAppError(error);
        lastError = appError.message;
        await this.localStore.replaceSyncItem({
          ...item,
          status: "PENDING",
          attempts: item.attempts + 1,
          lastError: appError.message,
          updatedAt: nowISO(),
        });
        failed += 1;
      }
    }

    const remaining = await this.localStore.getSyncQueue();
    const nextState: SyncState =
      failed > 0 ? "ERROR" : remaining.length > 0 ? "WAITING" : "SYNCED";

    this.update({
      state: nextState,
      queuedCount: remaining.length,
      lastSyncedAt: succeeded > 0 ? nowISO() : this.snapshot.lastSyncedAt,
      lastError: failed > 0 ? lastError : null,
    });

    return {
      attempted: queue.length,
      succeeded,
      failed,
      skipped: false,
      targetReady,
      finishedAt: nowISO(),
    };
  }

  dispose(): void {
    this.detachNetworkEvents?.();
    this.detachNetworkEvents = null;
    this.listeners.clear();
  }

  /** Perbarui snapshot, simpan, lalu beri tahu pendengar. */
  private update(patch: Partial<SyncStatusSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch, updatedAt: nowISO() };
    this.emit();
    void this.localStore.setSyncStatus(this.snapshot).catch((error: unknown) => {
      console.warn("[warungku] Gagal menyimpan status sinkronisasi.", error);
    });
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}
