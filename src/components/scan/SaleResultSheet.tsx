"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import type { SyncRunSummary } from "@/domain";
import { formatIDR } from "@/lib/money";

/**
 * Panel hasil simpan transaksi.
 * Jujur soal status: tanda ✓ hanya bila transaksi BENAR-BENAR masuk ke
 * Google Sheets. Bila gagal, transaksi aman di perangkat + tombol coba lagi
 * (tidak pernah dianggap berhasil — §11).
 */
export function SaleResultSheet({
  total,
  paymentType,
  customerName,
  sync,
  onRetrySync,
  onDone,
  retrying,
}: {
  total: number;
  paymentType: string;
  customerName: string | null;
  sync: SyncRunSummary;
  onRetrySync: () => void;
  onDone: () => void;
  retrying: boolean;
}) {
  const synced = !sync.skipped && sync.failed === 0 && sync.succeeded > 0;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60">
      <div className="animate-sheet-up w-full max-w-lg rounded-t-3xl bg-white p-5 pb-7 text-center">
        {synced ? (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Icon name="check" className="h-8 w-8" />
            </span>
            <h2 className="mt-3 text-base font-bold text-stone-900">
              ✓ Transaksi berhasil disimpan
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {paymentType === "BON" ? `Bon ${customerName}` : "Tunai"} ·{" "}
              {formatIDR(total)} — tersimpan ke Google Sheets warung Anda.
            </p>
            <button
              type="button"
              onClick={onDone}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80"
            >
              Transaksi Baru
            </button>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Icon name="alert" className="h-8 w-8" />
            </span>
            <h2 className="mt-3 text-base font-bold text-stone-900">
              Transaksi belum tersimpan
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Periksa koneksi dan coba lagi. Sementara ini transaksi{" "}
              {paymentType === "BON" ? `bon ${customerName ?? ""}` : "tunai"}{" "}
              {formatIDR(total)} aman tersimpan di perangkat.
            </p>
            <button
              type="button"
              disabled={retrying}
              onClick={onRetrySync}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80 disabled:opacity-50"
            >
              {retrying ? "Mengirim…" : "Coba Kirim Lagi"}
            </button>
            <Link
              href="/profil"
              className="mt-2 block text-xs font-semibold text-brand-700 underline"
            >
              Sambungkan Google Sheets di menu Profil
            </Link>
            <button
              type="button"
              onClick={onDone}
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center text-xs font-semibold text-stone-500"
            >
              Nanti saja — lanjut jualan
            </button>
          </>
        )}
      </div>
    </div>
  );
}
