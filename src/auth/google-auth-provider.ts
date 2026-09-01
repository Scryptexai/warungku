"use client";

import { AppError } from "@/lib/errors";
import type { AuthProvider } from "./auth-provider";
import type { AuthCallbackResult, AuthSession } from "./auth.types";

/**
 * Penyedia autentikasi Google sisi klien.
 * Login & token dikelola API routes server; kelas ini hanya membungkus
 * panggilan fetch agar UI tidak menyentuh detail HTTP.
 */
export class GoogleAuthProvider implements AuthProvider {
  async getSession(): Promise<AuthSession> {
    try {
      const response = await fetch("/api/auth/google/status", { cache: "no-store" });
      if (!response.ok) {
        return {
          state: "NOT_CONNECTED",
          email: null,
          displayName: null,
          picture: null,
          connectedAt: null,
          scopes: [],
        };
      }
      const body = (await response.json()) as {
        ok: boolean;
        data?: { connected: boolean; email: string | null; configured: boolean };
      };
      const connected = Boolean(body.ok && body.data?.connected);
      return {
        state: connected ? "CONNECTED" : "NOT_CONNECTED",
        email: body.data?.email ?? null,
        displayName: body.data?.email ?? null,
        picture: null,
        connectedAt: connected ? new Date().toISOString() : null,
        scopes: [],
      };
    } catch {
      return {
        state: "ERROR",
        email: null,
        displayName: null,
        picture: null,
        connectedAt: null,
        scopes: [],
      };
    }
  }

  async buildAuthorizationUrl(): Promise<string> {
    return "/api/auth/google/start";
  }

  async handleOAuthCallback(): Promise<AuthCallbackResult> {
    // Callback ditangani langsung oleh API route server; metode ini tidak
    // pernah dipanggil klien.
    throw new AppError("Callback OAuth ditangani oleh API route server.", {
      code: "NOT_IMPLEMENTED",
    });
  }

  async getAccessToken(): Promise<string | null> {
    // Token berada di cookie httpOnly — tidak tersedia untuk klien.
    return null;
  }

  async disconnect(): Promise<void> {
    await fetch("/api/auth/google/disconnect", { method: "POST" });
  }
}
