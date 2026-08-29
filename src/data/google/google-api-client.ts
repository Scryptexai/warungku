import { NotConnectedError } from "@/lib/errors";

/**
 * Abstraksi klien HTTP untuk Google APIs — SATU-SATUNYA tempat yang boleh
 * berbicara langsung dengan endpoint Google (implementasi pada Tahap 2).
 *
 * Memisahkan klien HTTP dari repositori membuat:
 * - GoogleSheetsStoreRepository bisa diuji dengan klien palsu (mock).
 * - Detail token/refresh/retry tidak bocor ke lapisan repositori.
 */

export type GoogleApiBase = "sheets" | "drive";

export interface GoogleApiClientRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Basis endpoint Google: "sheets" | "drive". */
  baseUrl?: GoogleApiBase;
  /** Path endpoint, mis. "/v4/spreadsheets/{id}/values/Produk". */
  path: string;
  searchParams?: Record<string, string>;
  body?: unknown;
}

export interface GoogleApiClient {
  /** Apakah klien memiliki token akses yang masih berlaku? */
  isConnected(): Promise<boolean>;
  /** Token akses untuk permintaan berikutnya, atau null bila belum login. */
  getAccessToken(): Promise<string | null>;
  /** Kirim permintaan terautentikasi (Bearer token) ke Google APIs. */
  request<TResponse>(request: GoogleApiClientRequest): Promise<TResponse>;
}

/**
 * Implementasi bawaan Tahap 1: klien "belum terhubung".
 * Tahap 2 menggantinya dengan implementasi OAuth sungguhan
 * (lihat src/auth) tanpa mengubah pemakainya.
 */
export class NotConnectedGoogleApiClient implements GoogleApiClient {
  async isConnected(): Promise<boolean> {
    return false;
  }

  async getAccessToken(): Promise<string | null> {
    return null;
  }

  async request<TResponse>(): Promise<TResponse> {
    throw new NotConnectedError(
      "Klien Google API belum terhubung — diimplementasikan pada Tahap 2.",
    );
  }
}
