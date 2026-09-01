/**
 * UTIL BARCODE (§5D) — normalisasi + validasi GTIN/EAN/UPC.
 *
 * ATURAN: barcode adalah IDENTIFIER NYATA, bukan nilai yang bisa
 * dikarang/ditebak. Semua barcode yang masuk katalog (master, impor CSV,
 * input kasir) HARUS melewati normalize → validate di modul ini.
 */

export type BarcodeType = "EAN8" | "UPC12" | "EAN13" | "GTIN14";

/**
 * Normalisasi aman: buang spasi/karakter format, SISAKAN digit apa adanya
 * (angka depan nol TETAP dipertahankan), hasil selalu STRING.
 */
export function normalizeBarcode(raw: string): string {
  return raw.replace(/[\s\-./]/g, "").trim();
}

/**
 * Hitung check digit standar GS1 (mod-10) dari digit sebelumnya.
 * Berlaku untuk EAN-8/UPC-12/EAN-13/GTIN-14 (penimbangan dari kanan).
 */
export function gs1CheckDigit(digitsWithoutCheck: string): number {
  const body = digitsWithoutCheck.split("").map(Number);
  let sum = 0;
  // Bobot 3,1,3,1,… dihitung dari digit TERAKANAN body.
  for (let i = body.length - 1, weight = 3; i >= 0; i -= 1, weight = weight === 3 ? 1 : 3) {
    sum += body[i]! * weight;
  }
  return (10 - (sum % 10)) % 10;
}

/** Deteksi tipe barcode berdasar panjang (setelah normalisasi). */
export function detectBarcodeType(normalized: string): BarcodeType | null {
  switch (normalized.length) {
    case 8:
      return "EAN8";
    case 12:
      return "UPC12";
    case 13:
      return "EAN13";
    case 14:
      return "GTIN14";
    default:
      return null;
  }
}

/** Pola mencurigakan (placeholder, bukan identifier nyata). */
function isSuspiciousPattern(normalized: string): boolean {
  if (/^(\d)\1+$/.test(normalized)) return true; // 0000000000000 / 111…
  if (normalized === "1234567890123" || normalized === "12345678901234") return true;
  if (/^12345678\d*$/.test(normalized)) return true;
  return false;
}

export interface BarcodeValidation {
  valid: boolean;
  /** Alasan penolakan dalam bahasa sederhana (null saat valid). */
  reason: string | null;
  type: BarcodeType | null;
  normalized: string;
}

/**
 * Validasi penuh: numerik → panjang didukung → checksum GS1 benar →
 * bukan pola placeholder. Checksum valid TIDAK berarti barcode milik
 * produk tertentu — kepercayaan produk tetap datang dari SUMBER DATA.
 */
export function validateBarcode(raw: string): BarcodeValidation {
  const normalized = normalizeBarcode(raw);
  if (!normalized) {
    return { valid: false, reason: "Barcode kosong.", type: null, normalized };
  }
  if (!/^\d+$/.test(normalized)) {
    return {
      valid: false,
      reason: "Barcode hanya boleh berisi angka.",
      type: null,
      normalized,
    };
  }
  const type = detectBarcodeType(normalized);
  if (!type) {
    return {
      valid: false,
      reason: "Panjang barcode tidak dikenali (harus 8/12/13/14 digit).",
      type: null,
      normalized,
    };
  }
  if (isSuspiciousPattern(normalized)) {
    return {
      valid: false,
      reason: "Barcode terlihat seperti contoh/placeholder — ditolak.",
      type,
      normalized,
    };
  }
  const body = normalized.slice(0, -1);
  const check = Number(normalized.slice(-1));
  if (gs1CheckDigit(body) !== check) {
    return {
      valid: false,
      reason: "Digit cek barcode salah — periksa kembali angkanya.",
      type,
      normalized,
    };
  }
  return { valid: true, reason: null, type, normalized };
}

/**
 * Prefiks GS1 milik Indonesia (899 = pendaftaran utama, 888 = alokasi
 * tambahan). Dipakai generator katalog untuk memprioritaskan produk
 * warung lokal — bukan syarat mutlak validitas.
 */
export function isIndonesianGsinPrefix(normalized: string): boolean {
  return normalized.startsWith("899") || normalized.startsWith("888");
}
