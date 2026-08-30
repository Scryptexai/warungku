import { cookies } from "next/headers";
import { decryptJSON, encryptJSON } from "./crypto";
import {
  refreshGoogleTokens,
  type GoogleTokenBundle,
} from "./google-oauth";

/**
 * Sesi token Google disimpan sebagai cookie terenkripsi (httpOnly).
 * Tidak ada token di localStorage, tidak ada token di database server.
 */

const TOKEN_COOKIE = "warungku_g";
const STATE_COOKIE = "warungku_oauth_state";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function readTokenBundle(): Promise<GoogleTokenBundle | null> {
  const store = await cookies();
  const raw = store.get(TOKEN_COOKIE)?.value;
  if (!raw) return null;
  return decryptJSON<GoogleTokenBundle>(raw);
}

export async function writeTokenBundle(bundle: GoogleTokenBundle): Promise<void> {
  const store = await cookies();
  store.set(TOKEN_COOKIE, encryptJSON(bundle), cookieOptions(THIRTY_DAYS));
}

export async function clearTokenBundle(): Promise<void> {
  const store = await cookies();
  store.set(TOKEN_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

export async function writeStateCookie(state: string): Promise<void> {
  const store = await cookies();
  store.set(STATE_COOKIE, state, cookieOptions(600));
}

export async function readAndClearStateCookie(): Promise<string | null> {
  const store = await cookies();
  const state = store.get(STATE_COOKIE)?.value ?? null;
  store.set(STATE_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  return state;
}

/**
 * Token yang pasti masih berlaku — perbarui otomatis bila kedaluwarsa.
 * Mengembalikan null bila tidak ada sesi / refresh gagal.
 * Email dipertahankan dari sesi sebelumnya (refresh tidak mengembalikannya).
 */
export async function getFreshTokenBundle(): Promise<GoogleTokenBundle | null> {
  const bundle = await readTokenBundle();
  if (!bundle) return null;

  const stillValid = bundle.expiresAt - 60_000 > Date.now();
  if (stillValid) return bundle;

  if (!bundle.refreshToken) {
    await clearTokenBundle();
    return null;
  }
  const refreshed = await refreshGoogleTokens(bundle.refreshToken);
  if (!refreshed) {
    await clearTokenBundle();
    return null;
  }
  const next: GoogleTokenBundle = {
    ...refreshed,
    email: bundle.email,
    connectedAt: bundle.connectedAt,
  };
  await writeTokenBundle(next);
  return next;
}
