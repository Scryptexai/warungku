import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google-oauth";
import { readAndClearStateCookie, writeTokenBundle } from "@/lib/auth-session";
import { apiError } from "@/types/api";

export const dynamic = "force-dynamic";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Callback OAuth: cek state, tukar kode menjadi token, simpan sesi
 * terenkripsi, lalu kembali ke halaman Profil untuk menyiapkan spreadsheet.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(new URL(`/profil?gagal=${encodeURIComponent(errorParam)}`, baseUrl()));
  }
  if (!code || !state) {
    return NextResponse.json(apiError("VALIDATION_FAILED", "Kode atau state OAuth tidak lengkap."), {
      status: 400,
    });
  }

  const expectedState = await readAndClearStateCookie();
  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(new URL("/profil?gagal=state", baseUrl()));
  }

  try {
    const bundle = await exchangeCodeForTokens(code);
    await writeTokenBundle(bundle);
    return NextResponse.redirect(new URL("/profil?terhubung=1", baseUrl()));
  } catch (error) {
    console.error("[warungku] Callback OAuth gagal:", error);
    return NextResponse.redirect(new URL("/profil?gagal=token", baseUrl()));
  }
}
