import type { ISODateTime } from "@/types/shared";

/**
 * Utilitas tanggal & waktu dengan lokal Indonesia.
 * Zona waktu default mengikuti mayoritas pengguna warung: Asia/Jakarta.
 */

export function nowISO(): ISODateTime {
  return new Date().toISOString();
}

/** Format tanggal panjang Indonesia, mis. "28 Agt 2026". */
export function formatDateID(iso: ISODateTime, timeZone = "Asia/Jakarta"): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone,
  }).format(new Date(iso));
}

/** Format tanggal + jam Indonesia, mis. "28 Agt 2026, 14.05". */
export function formatDateTimeID(iso: ISODateTime, timeZone = "Asia/Jakarta"): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}

/** Format jam saja, mis. "14.05". */
export function formatTimeID(iso: ISODateTime, timeZone = "Asia/Jakarta"): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}
