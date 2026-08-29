"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";
import type { Product } from "@/domain";
import { formatIDR, formatNumberID } from "@/lib/money";
import { cn } from "@/lib/cn";

/** Satu baris produk — kartu seluler: nama, harga, stok, barcode. */
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
        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-400">
          <Icon name="barcode" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{product.barcode}</span>
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
 * Layar Produk: cari (nama/barcode), lihat daftar, tambah produk.
 * Ketuk produk → detail → edit. Alur cepat: Cari → Pilih → Edit.
 */
export function ProductsScreen() {
  const { products } = useApp();
  const [items, setItems] = useState<Product[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    void products.listProducts().then((result) => {
      if (active) setItems(result);
    });
    return () => {
      active = false;
    };
  }, [products]);

  const trimmed = query.trim();
  const filtered = useMemo(() => {
    if (items === null) return null;
    if (!trimmed) return items;
    const q = trimmed.toLowerCase();
    return items.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
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
            placeholder="Cari nama atau barcode…"
            aria-label="Cari produk"
            className="min-h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400"
          />
        </div>
        <Link
          href="/produk/tambah"
          className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-white active:opacity-80"
        >
          <Icon name="plus" className="h-5 w-5" />
          Tambah
        </Link>
      </div>

      {items !== null ? (
        <p className="px-0.5 text-xs text-stone-400">
          {filtered?.length ?? 0} dari {items.length} produk
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
              title="Tidak ada produk yang cocok"
              description={`Tidak ditemukan produk dengan nama atau barcode "${trimmed}". Coba kata lain, atau tambah produk baru.`}
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
        Ketuk produk untuk melihat detail &amp; mengubah harga
      </p>
    </div>
  );
}
