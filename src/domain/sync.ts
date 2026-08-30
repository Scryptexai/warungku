import type { ISODateTime } from "@/types/shared";

/**
 * Kontrak data sinkronisasi.
 * Alur: OPERASI LOKAL → ANTREAN → TARGET REMOTE (Google Sheets) → BERHASIL.
 * Bila gagal (mis. jaringan putus), operasi TETAP di antrean dan dicoba ulang.
 */

/** Entitas yang bisa dioperasikan lewat antrean sinkronisasi. */
export const SYNC_ENTITIES = [
  "PRODUCT",
  "CUSTOMER",
  "TRANSACTION",
  "INVENTORY",
  "PRICE_HISTORY",
  "STORE",
  "META",
] as const;
export type SyncEntity = (typeof SYNC_ENTITIES)[number];

/** Jenis operasi terhadap entitas. */
export const SYNC_OPERATION_KINDS = ["CREATE", "UPDATE", "DELETE", "PING"] as const;
export type SyncOperationKind = (typeof SYNC_OPERATION_KINDS)[number];

/**
 * Satu operasi data yang siap dikirim ke Google Sheets.
 * `payload` adalah snapshot lengkap entitas agar pengiriman idempotent —
 * target cukup menimpa baris ber-ID sama.
 */
export interface SyncOperation {
  /** ID operasi (prefiks "op_") — dipakai untuk deduplikasi di sisi remote. */
  id: string;
  kind: SyncOperationKind;
  entity: SyncEntity;
  payload: unknown;
  createdAt: ISODateTime;
}

export const SYNC_QUEUE_ITEM_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
] as const;
export type SyncQueueItemStatus = (typeof SYNC_QUEUE_ITEM_STATUSES)[number];

/** Item antrean sinkronisasi yang tersimpan di penyimpanan lokal. */
export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  status: SyncQueueItemStatus;
  /** Berapa kali operasi ini sudah dicoba dikirim. */
  attempts: number;
  lastError: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Kondisi engine sinkronisasi secara keseluruhan. */
export type SyncState =
  | "IDLE" // tidak ada yang mengantre
  | "SYNCING" // sedang mengirim
  | "SYNCED" // semua terkirim
  | "WAITING" // ada antrean menunggu target siap/koneksi kembali
  | "ERROR"; // percobaan terakhir gagal, data tetap di antrean

/** Snapshot status sinkronisasi — dipublikasikan ke UI. */
export interface SyncStatusSnapshot {
  state: SyncState;
  queuedCount: number;
  lastSyncedAt: ISODateTime | null;
  lastError: string | null;
  updatedAt: ISODateTime;
}

/** Hasil satu sesi sinkronisasi (syncNow). */
export interface SyncRunSummary {
  attempted: number;
  succeeded: number;
  failed: number;
  /** True bila sesi dilewati (sedang berjalan, atau target belum siap). */
  skipped: boolean;
  targetReady: boolean;
  finishedAt: ISODateTime;
}
