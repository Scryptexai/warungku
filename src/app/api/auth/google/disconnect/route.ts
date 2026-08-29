import { NextResponse } from "next/server";
import { clearTokenBundle } from "@/lib/auth-session";
import { apiSuccess } from "@/types/api";

export const dynamic = "force-dynamic";

/** Memutus koneksi Google — menghapus cookie token terenkripsi. */
export async function POST() {
  await clearTokenBundle();
  return NextResponse.json(apiSuccess({ disconnected: true }));
}
