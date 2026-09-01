import type { ISODateTime } from "@/types/shared";

/**
 * Klien OAuth Google sisi SERVER (Authorization Code flow).
 * Semua panggilan ke server Google hanya terjadi di sini + API routes.
 */

export interface GoogleTokenBundle {
  accessToken: string;
  refreshToken: string | null;
  /** Waktu kedaluwarsa access token (epoch ms). */
  expiresAt: number;
  scope: string;
  email: string | null;
  connectedAt: ISODateTime;
}

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
] as const;

interface OAuthEndpoints {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function readEndpoints(): OAuthEndpoints | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ||
    `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

/** Apakah kredensial OAuth sudah dikonfigurasi di environment server? */
export function isOAuthConfigured(): boolean {
  return readEndpoints() !== null;
}

/** URL untuk memulai login Google (dipakai route /api/auth/google/start). */
export function buildAuthorizationUrl(state: string): string {
  const endpoints = readEndpoints();
  if (!endpoints) {
    throw new Error("Kredensial Google OAuth belum dikonfigurasi.");
  }
  const params = new URLSearchParams({
    client_id: endpoints.clientId,
    redirect_uri: endpoints.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
    include_granted_scopes: "true",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

async function fetchUserInfo(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

async function tokenRequest(
  endpoints: OAuthEndpoints,
  form: URLSearchParams,
): Promise<{ access_token: string; refresh_token?: string; expires_in: number; scope?: string }> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Token Google gagal (${response.status}): ${text.slice(0, 200)}`);
  }
  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };
}

/** Menukar kode OAuth menjadi token + email akun. */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenBundle> {
  const endpoints = readEndpoints();
  if (!endpoints) {
    throw new Error("Kredensial Google OAuth belum dikonfigurasi.");
  }
  const data = await tokenRequest(
    endpoints,
    new URLSearchParams({
      code,
      client_id: endpoints.clientId,
      client_secret: endpoints.clientSecret,
      redirect_uri: endpoints.redirectUri,
      grant_type: "authorization_code",
    }),
  );
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope ?? GOOGLE_SCOPES.join(" "),
    email: await fetchUserInfo(data.access_token),
    connectedAt: new Date().toISOString(),
  };
}

/** Memperbarui access token yang kedaluwarsa memakai refresh token. */
export async function refreshGoogleTokens(
  refreshToken: string,
): Promise<GoogleTokenBundle | null> {
  const endpoints = readEndpoints();
  if (!endpoints) return null;
  try {
    const data = await tokenRequest(
      endpoints,
      new URLSearchParams({
        refresh_token: refreshToken,
        client_id: endpoints.clientId,
        client_secret: endpoints.clientSecret,
        grant_type: "refresh_token",
      }),
    );
    return {
      accessToken: data.access_token,
      refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope ?? GOOGLE_SCOPES.join(" "),
      email: null,
      connectedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
