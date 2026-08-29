/**
 * Konstanta inti aplikasi Warungku.
 */

export const APP_NAME = "Warungku";

/** Fase roadmap yang sedang dikerjakan saat ini. */
export const CURRENT_PHASE = 1;
export const CURRENT_PHASE_LABEL = "Fondasi, UX Mobile & Kerangka Aplikasi";
export const TOTAL_ROADMAP_PHASES = 8;

/**
 * Namespace penyimpanan lokal perangkat.
 * Versi skema disertakan agar migrasi data lokal dapat dilakukan
 * pada fase berikutnya tanpa bentrok dengan data lama.
 */
export const LOCAL_STORAGE_NAMESPACE = "warungku";
export const LOCAL_STORAGE_SCHEMA_VERSION = 1;

/** Batas jumlah operasi yang dikirim per satu kali sesi sinkronisasi. */
export const DEFAULT_MAX_SYNC_OPERATIONS_PER_RUN = 50;
