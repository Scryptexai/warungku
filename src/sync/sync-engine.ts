import type {
  SyncOperation,
  SyncQueueItem,
  SyncRunSummary,
  SyncStatusSnapshot,
} from "@/domain";

/**
 * KONTRAK ENGINE SINKRONISASI.
 *
 * Arsitektur yang didukung (didokumentasikan di README):
 *
 *   OPERASI LOKAL → ANTREAN SYNC → GOOGLE SHEETS → SUKSES
 *
 *   OPERASI LOKAL → ANTREAN SYNC → GAGAL JARINGAN → TETAP DI ANTREAN
 *                 → DICOBa LAGI SAAT KONEKSI KEMBALI
 *
 * Tahap 1: QueueSyncEngine mengimplementasikan mekanika antrean lengkap,
 * dengan SyncTarget "belum terhubung" sebagai tujuan bawaan.
 * Tahap 2: GoogleSheetsSyncTarget (implementasi Google Sheets) menggantikan
 * target bawaan — antrean lama langsung terkirim begitu koneksi siap.
 */

/**
 * Port target remote. Implementasi Tahap 2 menerjemahkan setiap SyncOperation
 * menjadi penulisan baris pada Google Sheets (idempotent, berbasis ID).
 */
export interface SyncTarget {
  /** Apakah target siap menerima operasi (terautentikasi & spreadsheet ada)? */
  isReady(): Promise<boolean>;
  /**
   * Mengirim satu operasi. Harus idempotent: pengiriman ulang operasi yang
   * sama tidak boleh menghasilkan data ganda.
   */
  push(operation: SyncOperation): Promise<void>;
}

/** Pendengar perubahan status sinkronisasi (dipakai UI). */
export type SyncStatusListener = (status: SyncStatusSnapshot) => void;

export interface SyncEngine {
  /** Memuat antrean & status tersimpan, lalu memasang pendengar jaringan. */
  init(): Promise<void>;
  /** Snapshot status saat ini (sinkron, tanpa await). */
  getStatus(): SyncStatusSnapshot;
  /** Berlanggan perubahan status; mengembalikan fungsi berhenti berlanggan. */
  subscribe(listener: SyncStatusListener): () => void;
  /** Isi antrean saat ini. */
  getQueue(): Promise<SyncQueueItem[]>;
  /** Memasukkan operasi ke antrean lalu mencoba mengirim segera. */
  enqueue(operation: SyncOperation): Promise<SyncQueueItem>;
  /** Mencoba mengirim seluruh antrean sekarang. */
  syncNow(): Promise<SyncRunSummary>;
  /** Melepas sumber daya (pendengar jaringan, dsb.). */
  dispose(): void;
}
