/** Utilitas input angka gaya Indonesia untuk form (rupiah tanpa sen). */

/** Ambil hanya digit dari teks apa pun, mis. "3.500abc" → "3500". */
export function digitsOnly(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

/**
 * Ubah teks menjadi bilangan bulat ≥ 0.
 * Mengembalikan null bila tidak ada digit sama sekali.
 */
export function parseWholeNumber(raw: string): number | null {
  const digits = digitsOnly(raw);
  if (!digits) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}
