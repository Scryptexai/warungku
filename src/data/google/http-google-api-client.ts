import { AppError } from "@/lib/errors";
import type {
  GoogleApiClient,
  GoogleApiClientRequest,
} from "./google-api-client";

/**
 * Klien Google API sisi BROWSER.
 * Semua permintaan melewati proksi server (/api/sheets/request) sehingga
 * token OAuth tidak pernah disentuh JavaScript klien.
 */

interface StatusResponse {
  configured: boolean;
  connected: boolean;
  email: string | null;
}

const STATUS_CACHE_MS = 30_000;

export class HttpGoogleApiClient implements GoogleApiClient {
  private statusCache: { at: number; value: boolean } | null = null;

  async isConnected(): Promise<boolean> {
    if (this.statusCache && Date.now() - this.statusCache.at < STATUS_CACHE_MS) {
      return this.statusCache.value;
    }
    try {
      const response = await fetch("/api/auth/google/status", { cache: "no-store" });
      if (!response.ok) {
        this.statusCache = { at: Date.now(), value: false };
        return false;
      }
      const body = (await response.json()) as {
        ok: boolean;
        data?: StatusResponse;
      };
      const connected = Boolean(body.ok && body.data?.connected);
      this.statusCache = { at: Date.now(), value: connected };
      return connected;
    } catch {
      this.statusCache = { at: Date.now(), value: false };
      return false;
    }
  }

  async getAccessToken(): Promise<string | null> {
    // Token berada di cookie httpOnly server — klien tidak memegang token.
    return null;
  }

  async request<TResponse>(request: GoogleApiClientRequest): Promise<TResponse> {
    let response: Response;
    try {
      response = await fetch("/api/sheets/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: request.baseUrl ?? "sheets",
          path: request.path,
          method: request.method ?? "GET",
          query: request.searchParams,
          body: request.body,
        }),
      });
    } catch (error) {
      throw new AppError(
        "Tidak bisa menghubungi server. Periksa koneksi internet Anda.",
        { code: "NETWORK_ERROR", retryable: true, cause: error },
      );
    }

    let body: { ok: boolean; data?: unknown; error?: { code: string; message: string } };
    try {
      body = (await response.json()) as typeof body;
    } catch {
      throw new AppError("Respons server tidak dapat dibaca.", {
        code: "NETWORK_ERROR",
        retryable: true,
      });
    }

    if (!response.ok || !body.ok) {
      const code = body.error?.code ?? "GOOGLE_API_ERROR";
      if (response.status === 401 || code === "UNAUTHORIZED") {
        throw new AppError(
          body.error?.message ?? "Belum terhubung ke akun Google.",
          { code: "NOT_CONNECTED", retryable: true },
        );
      }
      throw new AppError(
        body.error?.message ?? "Google Sheets menolak permintaan.",
        { code: "GOOGLE_API_ERROR", retryable: true },
      );
    }

    return body.data as TResponse;
  }
}
