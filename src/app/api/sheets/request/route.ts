import { NextResponse } from "next/server";
import { getFreshTokenBundle } from "@/lib/auth-session";
import { apiError, apiSuccess } from "@/types/api";

export const dynamic = "force-dynamic";

/**
 * PROKSI Google API sisi server.
 * Token tinggal di cookie httpOnly — klien tidak pernah memegang token.
 * Hanya host Google yang diizinkan, dengan prefix path yang dibatasi.
 */

const ALLOWED_BASES: Record<string, string> = {
  sheets: "https://sheets.googleapis.com",
  drive: "https://www.googleapis.com",
};

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH"]);

interface ProxyBody {
  baseUrl?: string;
  path?: string;
  method?: string;
  query?: Record<string, string>;
  body?: unknown;
}

export async function POST(request: Request) {
  let payload: ProxyBody;
  try {
    payload = (await request.json()) as ProxyBody;
  } catch {
    return NextResponse.json(apiError("VALIDATION_FAILED", "Body permintaan tidak valid."), {
      status: 400,
    });
  }

  const baseName = payload.baseUrl ?? "sheets";
  const origin = ALLOWED_BASES[baseName];
  const path = payload.path ?? "";
  if (!origin || !path.startsWith("/") || path.includes("..")) {
    return NextResponse.json(apiError("VALIDATION_FAILED", "Endpoint tidak diizinkan."), {
      status: 400,
    });
  }
  const method = (payload.method ?? "GET").toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json(apiError("VALIDATION_FAILED", "Metode tidak diizinkan."), {
      status: 400,
    });
  }

  const bundle = await getFreshTokenBundle();
  if (!bundle) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "Belum terhubung ke akun Google. Sambungkan lewat menu Profil."),
      { status: 401 },
    );
  }

  const target = new URL(`${origin}${path}`);
  if (payload.query) {
    for (const [key, value] of Object.entries(payload.query)) {
      target.searchParams.set(key, value);
    }
  }

  let googleResponse: Response;
  try {
    googleResponse = await fetch(target.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${bundle.accessToken}`,
        ...(payload.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: payload.body !== undefined ? JSON.stringify(payload.body) : undefined,
      cache: "no-store",
    });
  } catch (error) {
    console.warn("[warungku] Google API tidak terjangkau:", error);
    return NextResponse.json(
      apiError("NETWORK_ERROR", "Tidak bisa menghubungi Google. Periksa koneksi internet."),
      { status: 502 },
    );
  }

  const text = await googleResponse.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!googleResponse.ok) {
    const message =
      (data as { error?: { message?: string } } | null)?.error?.message ??
      `Google API menolak permintaan (${googleResponse.status}).`;
    return NextResponse.json(apiError("GOOGLE_API_ERROR", message, googleResponse.status), {
      status: googleResponse.status === 401 ? 401 : 502,
    });
  }

  return NextResponse.json(apiSuccess(data ?? {}));
}
