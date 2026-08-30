/**
 * Perhitungan harga massal (mis. semua produk naik 10%).
 * Hasil dibulatkan ke ratusan rupiah terdekat agar harga tetap wajar.
 */

export type PriceChange =
  | { kind: "percent"; value: number } // mis. +10 / -5 (persen)
  | { kind: "fixed"; value: number }; // harga tetap (Rp)

/** Bulatkan ke ratusan rupiah terdekat. */
export function roundToHundreds(value: number): number {
  return Math.max(0, Math.round(value / 100) * 100);
}

/** Hitung harga baru dari harga lama + perubahan massal. */
export function computeBulkPrice(oldPrice: number, change: PriceChange): number {
  if (change.kind === "fixed") {
    return roundToHundreds(change.value);
  }
  return roundToHundreds(oldPrice * (1 + change.value / 100));
}
