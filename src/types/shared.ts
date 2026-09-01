/**
 * Tipe bersama lintas lapisan aplikasi.
 * Tipe di file ini tidak bergantung pada framework apa pun.
 */

/** Stempel waktu dalam format ISO 8601 (UTC), mis. "2026-08-28T02:10:00.000Z". */
export type ISODateTime = string;

/** Pengenal umum untuk entitas (string yang aman untuk URL/Sheets). */
export type ID = string;

/**
 * Nilai JSON yang bisa diserialisasi — dipakai untuk payload operasi
 * sinkronisasi dan detail error.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
