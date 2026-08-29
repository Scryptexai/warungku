import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Enkripsi token Google sisi server (AES-256-GCM).
 * Token tidak pernah disimpan di database aplikasi — hanya di cookie
 * terenkripsi milik perangkat warung itu sendiri.
 */

export class CryptoConfigError extends Error {}

function deriveKey(): Buffer {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new CryptoConfigError(
      "GOOGLE_TOKEN_ENCRYPTION_KEY belum diatur (minimal 32 karakter).",
    );
  }
  return createHash("sha256").update(raw).digest();
}

/** Enkripsi objek JSON → string base64 (iv + tag + ciphertext). */
export function encryptJSON(value: unknown): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/** Dekripsi string dari encryptJSON; null bila rusak/kunci berubah. */
export function decryptJSON<T>(payload: string): T | null {
  try {
    const key = deriveKey();
    const raw = Buffer.from(payload, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    return null;
  }
}

/** String acak untuk state anti-CSRF. */
export function randomState(): string {
  return randomBytes(16).toString("hex");
}
