import type { AuthCallbackResult, AuthSession, OAuthCallbackParams } from "./auth.types";

/**
 * KONTRAK PENYEDIA AUTENTIKASI.
 *
 * Aplikasi hanya mengenal interface ini — detail "bagaimana cara login"
 * disembunyikan. Tahap 2 menyediakan GoogleOAuthProvider (Authorization Code
 * flow dengan PKCE/state via API routes), pengganti langsung implementasi
 * bawaan NotConnectedAuthProvider tanpa perubahan pada konsumen.
 */
export interface AuthProvider {
  /** Sesi aktif saat ini (null-state bila belum terhubung). */
  getSession(): Promise<AuthSession>;
  /**
   * URL untuk memulai login Google.
   * @param returnPath path aplikasi untuk kembali setelah login sukses.
   */
  buildAuthorizationUrl(returnPath?: string): Promise<string>;
  /** Menukar kode OAuth menjadi sesi; dipanggil dari API route callback. */
  handleOAuthCallback(params: OAuthCallbackParams): Promise<AuthCallbackResult>;
  /** Token akses untuk klien Google API, atau null bila sesi tidak valid. */
  getAccessToken(): Promise<string | null>;
  /** Memutus koneksi akun Google dan membersihkan sesi. */
  disconnect(): Promise<void>;
}
