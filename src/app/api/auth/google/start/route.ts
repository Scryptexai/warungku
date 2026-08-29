import { NextResponse } from "next/server";
import { randomState } from "@/lib/crypto";
import { buildAuthorizationUrl, isOAuthConfigured } from "@/lib/google-oauth";
import { writeStateCookie } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/** Memulai login Google: simpan state anti-CSRF lalu arahkan ke Google. */
export async function GET() {
  if (!isOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/profil?gagal=konfigurasi", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    );
  }
  const state = randomState();
  await writeStateCookie(state);
  return NextResponse.redirect(buildAuthorizationUrl(state));
}
