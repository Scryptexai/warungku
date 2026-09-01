"use client";

import { useEffect } from "react";

/**
 * BATAS ERROR APLIKASI (§6 error handling) — bila komponen gagal, pemilik
 * melihat pesan Indonesia yang menenangkan (BUKAN stack trace/istilah
 * teknis) dan datanya tetap aman di perangkat.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[warungku] Kesalahan antarmuka:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
        🙏
      </span>
      <h1 className="text-base font-bold text-stone-900">
        Ada kendala sebentar di aplikasi
      </h1>
      <p className="max-w-[32ch] text-xs leading-relaxed text-stone-500">
        Jangan khawatir — data penjualan dan bon Anda tetap aman tersimpan di
        perangkat ini. Coba buka ulang halaman ini.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 min-h-11 rounded-xl bg-stone-900 px-5 text-sm font-bold text-white active:scale-[0.98]"
      >
        Coba Lagi
      </button>
    </div>
  );
}
