import type { ISODateTime } from "@/types/shared";

/**
 * Kontrak sesi autentikasi Google.
 * Tahap 1 hanya menetapkan bentuknya; implementasi OAuth ada di Tahap 2.
 */

/** Scope OAuth yang dibutuhkan aplikasi. */
export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  /** Baca/tulis Google Sheets yang dibuat atau dibagikan ke aplikasi. */
  "https://www.googleapis.com/auth/spreadsheets",
  /** Membuat spreadsheet baru khusus untuk warung (drive.file = terbatas file yang dibuat aplikasi). */
  "https://www.googleapis.com/auth/drive.file",
] as const;

export type AuthConnectionState =
  | "NOT_CONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "EXPIRED"
  | "ERROR";

export interface AuthSession {
  state: AuthConnectionState;
  email: string | null;
  displayName: string | null;
  picture: string | null;
  connectedAt: ISODateTime | null;
  scopes: string[];
}

export interface OAuthCallbackParams {
  code: string;
  /** Parameter state anti-CSRF yang dikirim saat memulai login. */
  state?: string;
}

export interface AuthCallbackResult {
  session: AuthSession;
  /** Ke mana harus diarahkan setelah callback sukses. */
  redirectTo: string;
}

/** Sesi bawaan sebelum warung menghubungkan akun Google-nya. */
export const NOT_CONNECTED_SESSION: AuthSession = {
  state: "NOT_CONNECTED",
  email: null,
  displayName: null,
  picture: null,
  connectedAt: null,
  scopes: [],
};
