"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";
import type { Product } from "@/domain";
import { formatIDR, formatNumberID } from "@/lib/money";
import { cn } from "@/lib/cn";

/** Satu baris produk — kartu seluler: nama, harga, stok (info terpenting). */
function ProductRow({ product }: { product: Product }) {
  return (
    <Link
      href={`/produk/${product.id}`}
      className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-900/5 active:bg-stone-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
        {product.name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-stone-900">
          {product.name}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-stone-400">
          {product.category ? `${product.category} · ` : ""}
          <span className="font-mono">{product.barcode}</span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-bold text-brand-700">
          {formatIDR(product.currentPrice)}
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[11px]",
            product.stock === 0 ? "font-semibold text-red-500" : "text-stone-400",
          )}
        >
          {product.stock === 0 ? "Stok habis" : `Stok ${formatNumberID(product.stock)}`}
        </span>
      </span>
    </Link>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
      <div className="h-11 w-11 animate-pulse rounded-xl bg-stone-100" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-stone-100" />
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-stone-100" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-3.5 w-16 animate-pulse rounded bg-stone-100" />
        <div className="ml-auto h-2.5 w-10 animate-pulse rounded bg-stone-100" />
      </div>
    </div>
  );
}

/**
 * Layar Produk — data dari CACHE SESI (CatalogProvider):
 * kunjungan pertama memuat dari perangkat, kunjungan berikutnya INSTAN
 * tanpa skeleton. Google Sheets ditarik di belakang maksimal 1×/menit.
 */
export function ProductsScreen() {
  const { products: catalogProducts, ensureLocal, refreshFromSheets, lastSheetsFetchAt } =
    useCatalog();
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);

  useEffect(() => {
    void ensureLocal();
    void refreshFromSheets(); // dibatasi TTL — diam-diam di belakang
  }, [ensureLocal, refreshFromSheets]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshError(false);
    try {
      await refreshFromSheets(true);
    } catch {
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  }

  const trimmed = query.trim();
  const filtered = useMemo(() => {
    if (catalogProducts === null) return null;
    if (!trimmed) return catalogProducts;
    const q = trimmed.toLowerCase();
    return catalogProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        (product.category ?? "").toLowerCase().includes(q) ||
        (product.barcode ?? "").includes(q.replace(/\s+/g, "")),
    );
  }, [catalogProducts, trimmed]);

  const sheetsLabel = lastSheetsFetchAt
    ? new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(
        new Date(lastSheetsFetchAt),
      )
    : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama, barcode, atau kategori…"
            aria-label="Cari produk"
            className="min-h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          aria-label="Muat ulang dari Google Sheets"
          title="Muat ulang dari Google Sheets"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-600 active:opacity-80 disabled:opacity-50"
        >
          <Icon name="sync" className={cn("h-5 w-5", refreshing && "animate-spin")} />
        </button>
        <Link
          href="/produk/tambah"
          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-white active:opacity-80"
        >
          <Icon name="plus" className="h-5 w-5" />
          Tambah
        </Link>
      </div>

      {filtered !== null ? (
        <p className="flex flex-wrap items-center gap-x-1.5 px-0.5 text-xs text-stone-400">
          <span>
            {filtered.length} dari {catalogProducts?.length ?? 0} produk
          </span>
          {sheetsLabel ? (
            <span className="text-stone-300">· Google Sheets {sheetsLabel}</span>
          ) : null}
        </p>
      ) : null}

      {refreshError ? (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800"
        >
          Tidak bisa memuat data dari Google Sheets — menampilkan data di
          perangkat ini. Periksa koneksi, lalu tekan tombol segarkan.
        </p>
      ) : null}

      <div className="space-y-2">
        {filtered === null ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : filtered.length === 0 ? (
          trimmed ? (
            <EmptyState
              iconName="box"
              title="Produk tidak ditemukan"
              description={`Tidak ada produk dengan nama, barcode, atau kategori "${trimmed}". Coba kata lain, atau tambah produk baru.`}
            />
          ) : (
            <EmptyState
              iconName="box"
              title="Belum ada produk"
              description="Tambahkan produk pertama warung Anda — cukup isi nama, barcode, kategori, harga, dan stok."
            >
              <Link
                href="/produk/tambah"
                className="mt-2 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white active:opacity-80"
              >
                Tambah Produk
              </Link>
            </EmptyState>
          )
        ) : (
          filtered.map((product) => <ProductRow key={product.id} product={product} />)
        )}
      </div>

      <p className="pt-1 text-center text-[11px] text-stone-400">
        Ketuk produk untuk melihat detail &amp; mengubah harga / stok / satuan
      </p>
    </div>
  );
}
