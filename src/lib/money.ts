/**
 * Utilitas uang dalam Rupiah.
 * Semua nilai uang di Warungku disimpan sebagai integer Rupiah (tanpa sen),
 * karena Rupiah tidak memiliki pecahan sen dalam praktik warung.
 */

/** Format angka menjadi teks Rupiah, mis. 12500 -> "Rp 12.500". */
export function formatIDR(amount: number, locale = "id-ID"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format angka dengan pemisah ribuan gaya Indonesia, mis. 12500 -> "12.500". */
export function formatNumberID(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}
