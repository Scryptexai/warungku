import type { ISODateTime } from "@/types/shared";

/**
 * Utilitas tanggal & waktu dengan lokal Indonesia.
 * Zona waktu default mengikuti mayoritas pengguna warung: Asia/Jakarta.
 */

/**
 * ZONA WAKTU RESMI APLIKASI (§7): satu-satunya acuan batas hari/minggu/bulan
 * untuk laporan — TIDAK mengikuti zona perangkat, agar omzet "hari ini"
 * konsisten dengan jam tampilan aplikasi. (Asia/Jakarta = WIB, +07:00,
 * tanpa DST — offset tetap sepanjang tahun.)
 */
export const APP_TIME_ZONE = "Asia/Jakarta";

/**
 * Selisih ms antara dinding-waktu `tz` dan UTC pada saat `date`
 * (positif bila tz di depan UTC). Pola Intl standar — aman DST.
 */
function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUTC - date.getTime();
}

/**
 * "Kunci hari" YYYY-MM-DD menurut dinding-waktu `tz` — dipakai laporan
 * untuk mengelompokkan transaksi per hari TANPA mengubah jam transaksi
 * yang tersimpan (aturan DATE/TIME §7).
 */
export function dayKeyInTZ(date: Date, timeZone = APP_TIME_ZONE): string {
  return new Date(date.getTime() + tzOffsetMs(date, timeZone))
    .toISOString()
    .slice(0, 10);
}

/**
 * Mulai hari (00:00 dinding-waktu `tz`) dari kunci hari YYYY-MM-DD.
 */
export function dayKeyToUTC(dayKey: string, timeZone = APP_TIME_ZONE): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  const naive = Date.UTC(y!, m! - 1, d!);
  // Offset bisa bergesir 1 hari bila batas DST — cari offset pada tengah
  // hari naive lalu koreksi (Asia/Jakarta tetap, ini pengaman umum).
  const offset = tzOffsetMs(new Date(naive + 12 * 3_600_000), timeZone);
  return naive - offset;
}

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
