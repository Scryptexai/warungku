/**
 * Konfigurasi environment.
 *
 * Aturan penting:
 * - Nilai NEXT_PUBLIC_* boleh dibaca di browser (aman untuk diketahui publik).
 * - Nilai TANPA prefiks NEXT_PUBLIC_ (mis. GOOGLE_CLIENT_SECRET) HANYA boleh
 *   dibaca di server — jangan pernah mengimpornya dari komponen klien.
 * - Tidak ada kredensial yang ditulis langsung di kode sumber; semuanya lewat
 *   environment variable (lihat .env.example).
 */

export type AppEnvironmentName = "development" | "test" | "production";

export interface PublicAppEnv {
  appName: string;
  appEnv: AppEnvironmentName;
  appUrl: string;
  defaultCurrency: string;
  defaultLocale: string;
  defaultTimezone: string;
}

function readString(raw: string | undefined, fallback: string): string {
  const value = raw?.trim();
  return value && value.length > 0 ? value : fallback;
}

/**
 * Konfigurasi publik aplikasi (aman dipanggil di klien maupun server).
 */
export function getPublicAppEnv(): PublicAppEnv {
  const appEnv = readString(process.env.NEXT_PUBLIC_APP_ENV, "development");
  return {
    appName: readString(process.env.NEXT_PUBLIC_APP_NAME, "Warungku"),
    appEnv: (["development", "test", "production"] as const).includes(
      appEnv as AppEnvironmentName,
    )
      ? (appEnv as AppEnvironmentName)
      : "development",
    appUrl: readString(process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000"),
    defaultCurrency: readString(process.env.NEXT_PUBLIC_DEFAULT_CURRENCY, "IDR"),
    defaultLocale: readString(process.env.NEXT_PUBLIC_DEFAULT_LOCALE, "id-ID"),
    defaultTimezone: readString(process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE, "Asia/Jakarta"),
  };
}

/**
 * Konfigurasi Google sisi server — DIPAKAI MULAI TAHAP 2.
 * `isConfigured` memberi tahu apakah kredensial OAuth sudah tersedia di
 * environment, tanpa pernah membocorkan nilainya ke klien.
 */
export interface GoogleServerEnv {
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string | null;
  tokenEncryptionKey: string | null;
  /** URI callback OAuth default yang disusun dari appUrl. */
  defaultRedirectUri: string;
  isConfigured: boolean;
}

export function getGoogleServerEnv(): GoogleServerEnv {
  const publicEnv = getPublicAppEnv();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || null;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || null;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || null;
  const tokenEncryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() || null;
  const defaultRedirectUri = `${publicEnv.appUrl.replace(/\/$/, "")}/api/auth/google/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    tokenEncryptionKey,
    defaultRedirectUri,
    isConfigured: Boolean(clientId && clientSecret),
  };
}
