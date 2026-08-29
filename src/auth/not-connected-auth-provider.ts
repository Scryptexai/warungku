import { NotConnectedError } from "@/lib/errors";
import type { AuthProvider } from "./auth-provider";
import { NOT_CONNECTED_SESSION, type AuthSession } from "./auth.types";

/**
 * Penyedia autentikasi bawaan Tahap 1: "belum terhubung".
 * Seluruh alur login menolak dengan NotConnectedError sampai Tahap 2
 * menghadirkan GoogleOAuthProvider.
 */
export class NotConnectedAuthProvider implements AuthProvider {
  async getSession(): Promise<AuthSession> {
    return { ...NOT_CONNECTED_SESSION };
  }

  async buildAuthorizationUrl(): Promise<string> {
    throw new NotConnectedError(
      "Login Google diimplementasikan pada Tahap 2 (Google Account & Google Sheets data layer).",
    );
  }

  async handleOAuthCallback(): Promise<import("./auth.types").AuthCallbackResult> {
    throw new NotConnectedError(
      "Callback OAuth diimplementasikan pada Tahap 2.",
    );
  }

  async getAccessToken(): Promise<string | null> {
    return null;
  }

  async disconnect(): Promise<void> {
    // Belum ada sesi aktif yang perlu diputus pada Tahap 1.
  }
}
