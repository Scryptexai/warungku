import { NextResponse } from "next/server";
import { isOAuthConfigured } from "@/lib/google-oauth";
import { readTokenBundle } from "@/lib/auth-session";
import { apiSuccess } from "@/types/api";

export const dynamic = "force-dynamic";

/**
 * Status koneksi Google untuk UI.
 * Hanya membocorkan: configured / connected / email — bukan token.
 */
export async function GET() {
  const configured = isOAuthConfigured();
  const bundle = await readTokenBundle();
  const connected = Boolean(
    bundle && (bundle.expiresAt > Date.now() || bundle.refreshToken),
  );
  return NextResponse.json(
    apiSuccess({
      configured,
      connected,
      email: bundle?.email ?? null,
      hasSpreadsheetAccess: Boolean(bundle),
    }),
  );
}
