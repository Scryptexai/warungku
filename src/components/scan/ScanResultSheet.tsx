"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { QtyStepper } from "./QtyStepper";
import type { Product } from "@/domain";
import { formatIDR, formatNumberID } from "@/lib/money";

export type ProductSuggestion = {
  barcode: string;
  name: string;
  category: string | null;
  unit: string;
  suggestedPrice: number | null;
  source: "master" | "online";
};

export type ScanResult =
  | { kind: "found"; product: Product }
  | { kind: "master"; suggestion: ProductSuggestion }
  | { kind: "not-found"; barcode: string };

/** URL form tambah produk dengan semua saran sudah terisi. */
function suggestionHref(s: ProductSuggestion): string {
  const params = new URLSearchParams({
    barcode: s.barcode,
    nama: s.name,
    alur: "scan",
  });
  if (s.category) params.set("kategori", s.category);
  if (s.suggestedPrice !== null) params.set("harga", String(s.suggestedPrice));
  params.set("satuan", s.unit);
  return `/produk/tambah?${params.toString()}`;
}

/**
 * Panel hasil scan di bagian bawah layar. Tiga kemungkinan:
 *  - DITEMUKAN di katalog warung → info produk + jumlah → tambah ke transaksi.
 *  - DITEMUKAN di MASTER/ONLINE  → saran produk (nama, kategori, harga
 *    rekomendasi) → sekali ketuk "Tambahkan ke Warung Saya" (form terisi).
 *  - BELUM ADA → "Produk belum terdaftar" → form manual (barcode terisi).
 */
export function ScanResultSheet({
  result,
  onAddToCart,
  onScanAgain,
}: {
  result: ScanResult;
  /** Dipanggil dengan jumlah yang dipilih user (produk katalog ditemukan). */
  onAddToCart: (product: Product, quantity: number) => void;
  onScanAgain: () => void;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60">
      <div className="animate-sheet-up max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-7">
        {result.kind === "found" ? (
          <>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Icon name="check" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-stone-900">Produk Ditemukan</h2>
                <p className="text-[11px] text-stone-500">Atur jumlah, lalu masukkan ke transaksi</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-stone-50 p-4">
              <p className="text-base font-bold text-stone-900">{result.product.name}</p>
              <p className="mt-0.5 text-lg font-bold text-brand-700">
                {formatIDR(result.product.currentPrice)}
                <span className="ml-1 text-xs font-medium text-stone-500">
                  / {result.product.unit}
                </span>
              </p>
              <dl className="mt-2 space-y-1 text-xs text-stone-500">
                <div className="flex justify-between gap-3">
                  <dt>Stok sekarang</dt>
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

              <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-stone-200">
                <span className="text-sm font-semibold text-stone-700">Jumlah</span>
                <QtyStepper value={quantity} onChange={setQuantity} />
              </div>
              <p className="mt-2 text-right text-sm font-bold text-stone-900">
                Subtotal: {formatIDR(result.product.currentPrice * quantity)}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => onAddToCart(result.product, quantity)}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80"
              >
                <Icon name="cart" className="h-5 w-5" />
                Tambah ke Transaksi
              </button>
              <button
                type="button"
                onClick={onScanAgain}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 active:opacity-80"
              >
                Scan Lagi
              </button>
            </div>
            <Link
              href={`/produk/${result.product.id}`}
              className="mt-2 block text-center text-xs font-semibold text-stone-500 underline"
            >
              Lihat detail produk
            </Link>
          </>
        ) : result.kind === "master" ? (
          <>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <Icon name="box" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-stone-900">Dikenali di Database Produk</h2>
                <p className="text-[11px] text-stone-500">
                  {result.suggestion.source === "master"
                    ? "Master produk bawaan (offline)"
                    : "Open Food Facts (online)"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-stone-50 p-4">
              <p className="text-base font-bold text-stone-900">{result.suggestion.name}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-stone-400">
                {result.suggestion.barcode}
              </p>
              <dl className="mt-2 space-y-1 text-xs text-stone-500">
                {result.suggestion.category ? (
                  <div className="flex justify-between gap-3">
                    <dt>Kategori</dt>
                    <dd className="font-semibold text-stone-800">
                      {result.suggestion.category}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt>Harga rekomendasi</dt>
                  <dd className="font-semibold text-stone-800">
                    {result.suggestion.suggestedPrice !== null
                      ? formatIDR(result.suggestion.suggestedPrice)
                      : "— (isi sendiri)"}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-stone-500">
              Produk ini belum ada di katalog warung Anda. Satu ketuk untuk
              menambahkan — nama, kategori, dan harga rekomendasi sudah terisi;
              Anda tinggal memeriksa harga dan mengisi stok.
            </p>

            <div className="mt-4 flex gap-2">
              <Link
                href={suggestionHref(result.suggestion)}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80"
              >
                <Icon name="plus" className="h-5 w-5" />
                Tambahkan ke Warung Saya
              </Link>
              <button
                type="button"
                onClick={onScanAgain}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 active:opacity-80"
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
                <h2 className="text-sm font-bold text-stone-900">Produk belum terdaftar</h2>
                <p className="text-[11px] text-stone-500">
                  Tidak ditemukan di katalog warung maupun database produk
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
              Tambahkan sekali saja — setelah disimpan, Anda kembali ke transaksi
              dan scan barang ini langsung dikenali.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/produk/tambah?barcode=${encodeURIComponent(result.barcode)}&alur=scan`}
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
