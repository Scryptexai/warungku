import { NextResponse } from "next/server";
import { CURRENT_PHASE } from "@/config/app";
import { getPublicAppEnv } from "@/config/env";
import { nowISO } from "@/lib/datetime";
import { apiSuccess } from "@/types/api";

/**
 * Health check API — fondasi lapisan API aplikasi.
 * Tahap 2 menambahkan route OAuth (/api/auth/google/*) dan sinkronisasi
 * dengan bentuk respons standar yang sama (ApiBody).
 */
export const dynamic = "force-dynamic";

export function GET() {
  const env = getPublicAppEnv();
  return NextResponse.json(
    apiSuccess({
      status: "ok",
      app: env.appName,
      phase: CURRENT_PHASE,
      environment: env.appEnv,
      currency: env.defaultCurrency,
      timezone: env.defaultTimezone,
      time: nowISO(),
    }),
  );
}
