/**
 * Pembuat pengenal (ID) yang aman dipakai di browser maupun server.
 * ID berbentuk UUID v4 bila Web Crypto tersedia, dengan fallback tanpa-crypto.
 */

export function generateId(): string {
  const cryptoRef = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * ID dengan prefiks agar mudah dikenali saat dibaca di Google Sheets,
 * mis. "prd_xxx" (produk), "cst_xxx" (pelanggan), "trx_xxx" (transaksi).
 */
export function createPrefixedId(prefix: string): string {
  return `${prefix}_${generateId()}`;
}
