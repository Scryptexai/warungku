"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";
import type { Product } from "@/domain";
import { AppError } from "@/lib/errors";
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
 * Layar Produk: cari (nama/barcode/kategori), daftar produk, tambah produk,
 * dan muat ulang katalog langsung dari Google Sheets milik toko.
 * Baca Google Sheets gagal? Tetap menampilkan data perangkat (offline-first).
 */
export function ProductsScreen() {
  const { products } = useApp();
  const [items, setItems] = useState<Product[] | null>(null);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [syncedAtLabel, setSyncedAtLabel] = useState<string | null>(null);

  const loadCache = useCallback(async () => {
    const cached = await products.listProducts();
    setItems(cached);
  }, [products]);

  /** Menarik katalog terbaru dari Google Sheets (baca → cache perangkat). */
  const refreshFromSheets = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await products.listProducts({ refresh: true });
      setItems(fresh);
      setRefreshError(false);
      setSyncedAtLabel(
        new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date()),
      );
    } catch (error) {
      // Belum terhubung = kondisi normal, bukan error bagi pengguna.
      if (!(error instanceof AppError && error.code === "NOT_CONNECTED")) {
        setRefreshError(true);
      }
    } finally {
      setRefreshing(false);
    }
  }, [products]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await loadCache();
      if (active) void refreshFromSheets(); // muat ulang diam-diam di belakang
    })();
    return () => {
      active = false;
    };
  }, [loadCache, refreshFromSheets]);

  const trimmed = query.trim();
  const filtered = useMemo(() => {
    if (items === null) return null;
    if (!trimmed) return items;
    const q = trimmed.toLowerCase();
    return items.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        (product.category ?? "").toLowerCase().includes(q) ||
        (product.barcode ?? "").includes(q.replace(/\s+/g, "")),
    );
  }, [items, trimmed]);

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
          onClick={() => void refreshFromSheets()}
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

      {items !== null ? (
        <p className="flex flex-wrap items-center gap-x-1.5 px-0.5 text-xs text-stone-400">
          <span>
            {filtered?.length ?? 0} dari {items.length} produk
          </span>
          {syncedAtLabel ? (
            <span className="text-stone-300">· Google Sheets {syncedAtLabel}</span>
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
