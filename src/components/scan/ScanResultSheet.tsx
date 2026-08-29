"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import type { Product } from "@/domain";
import { formatIDR, formatNumberID } from "@/lib/money";

export type ScanResult =
  | { kind: "found"; product: Product }
  | { kind: "not-found"; barcode: string };

/**
 * Panel hasil scan di bagian bawah layar.
 * Dua kemungkinan (sesuai prinsip: scan → produk dikenali / daftar baru):
 *  - DITEMUKAN  → info produk + tombol lihat produk.
 *  - BELUM ADA  → "Produk belum terdaftar" + tombol tambah (barcode terisi).
 */
export function ScanResultSheet({
  result,
  onScanAgain,
}: {
  result: ScanResult;
  onScanAgain: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60">
      <div className="animate-sheet-up w-full max-w-lg rounded-t-3xl bg-white p-5 pb-7">
        {result.kind === "found" ? (
          <>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Icon name="check" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-stone-900">Produk Ditemukan</h2>
                <p className="text-[11px] text-stone-500">Barcode sudah terdaftar</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-stone-50 p-4">
              <p className="text-base font-bold text-stone-900">{result.product.name}</p>
              <p className="mt-0.5 text-lg font-bold text-brand-700">
                {formatIDR(result.product.currentPrice)}
              </p>
              <dl className="mt-2 space-y-1 text-xs text-stone-500">
                <div className="flex justify-between gap-3">
                  <dt>Stok</dt>
                  <dd className="font-semibold text-stone-800">
                    {formatNumberID(result.product.stock)} {result.product.unit}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Barcode</dt>
                  <dd className="truncate font-semibold text-stone-800">
                    {result.product.barcode}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/produk/${result.product.id}`}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80"
              >
                Lihat Produk
              </Link>
              <button
                type="button"
                onClick={onScanAgain}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-700 active:opacity-80"
              >
                Scan Lagi
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Icon name="alert" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-stone-900">
                  Produk belum terdaftar
                </h2>
                <p className="text-[11px] text-stone-500">
                  Barcode ini belum ada di daftar produk
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-center">
              <p className="text-xs text-stone-500">Barcode terbaca</p>
              <p className="mt-1 break-all font-mono text-base font-bold tracking-wide text-stone-900">
                {result.barcode}
              </p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-stone-500">
              Tambahkan sekali saja — setelah ini, scan barcode yang sama akan
              langsung mengenali produk ini.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/produk/tambah?barcode=${encodeURIComponent(result.barcode)}`}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80"
              >
                <Icon name="plus" className="h-5 w-5" />
                Tambah Produk
              </Link>
              <button
                type="button"
                onClick={onScanAgain}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-700 active:opacity-80"
              >
                Scan Lagi
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
