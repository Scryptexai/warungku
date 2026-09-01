import type { GoogleApiClient } from "./google-api-client";

/**
 * Primitif baca/tulis Google Sheets Values API (dipakai sinkronisasi).
 * Semua lewat proksi server — klien tidak memegang token.
 */

/** Indeks kolom 0-based dari huruf kolom (A → 0, B → 1, …). */
export function columnToIndex(column: string): number {
  let index = 0;
  for (const char of column.toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - "A".charCodeAt(0) + 1);
  }
  return index - 1;
}

function valuesPath(spreadsheetId: string, range: string): string {
  return `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
}

/** Baca satu kolom penuh, mis. range "PRODUCTS!B:B" → string[][]. */
export async function readValues(
  client: GoogleApiClient,
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const data = await client.request<{ values?: string[][] } | null>({
    path: valuesPath(spreadsheetId, range),
  });
  return data?.values ?? [];
}

/**
 * Cari baris (nomor 1-based) yang kolomnya sama persis dengan `value`.
 * Mengembalikan null bila tidak ditemukan. Baris 1 adalah header.
 *
 * Catatan: range satu kolom ("B:B") hanya mengembalikan sel kolom itu,
 * sehingga perbandingan memakai indeks 0 dari tiap baris hasil.
 */
export async function findRowByValue(
  client: GoogleApiClient,
  spreadsheetId: string,
  sheetName: string,
  column: string,
  value: string,
): Promise<number | null> {
  const values = await readValues(client, spreadsheetId, `${sheetName}!${column}:${column}`);
  for (let i = 0; i < values.length; i += 1) {
    if ((values[i]?.[0] ?? "") === value) {
      return i + 1; // baris 1-based di sheet
    }
  }
  return null;
}

/** Tambahkan baris baru di akhir tab. */
export async function appendRows(
  client: GoogleApiClient,
  spreadsheetId: string,
  sheetName: string,
  rows: Array<Array<string | number>>,
): Promise<void> {
  await client.request({
    method: "POST",
    path: `${valuesPath(spreadsheetId, `${sheetName}!A:Z`)}:append`,
    searchParams: { valueInputOption: "RAW", insertDataOption: "INSERT_ROWS" },
    body: { values: rows },
  });
}

/** Timpa satu baris (nomor 1-based) mulai kolom A. */
export async function updateRow(
  client: GoogleApiClient,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  values: Array<string | number>,
): Promise<void> {
  await client.request({
    method: "PUT",
    path: valuesPath(spreadsheetId, `${sheetName}!A${rowNumber}`),
    searchParams: { valueInputOption: "RAW" },
    body: { values: [values] },
  });
}

/** Pecah stempel waktu ISO menjadi tanggal & jam lokal (default Jakarta). */
export function splitDateTime(
  iso: string,
  timeZone = "Asia/Jakarta",
): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}
