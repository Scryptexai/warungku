"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { Icon } from "@/components/ui/icons";
import type { Product } from "@/domain";
import { formatIDR, formatNumberID } from "@/lib/money";

/**
 * Detail produk: nama, barcode, kategori, harga jual, stok + tombol Edit.
 * Tanpa aksi lain — tetap sederhana sesuai prinsip fase ini.
 */
export function ProductDetailScreen({ productId }: { productId: string }) {
  const { products } = useApp();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void products.getProductById(productId).then((result) => {
      if (active) setProduct(result);
    });
    return () => {
      active = false;
    };
  }, [products, productId]);

  if (product === undefined) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-2xl bg-white ring-1 ring-stone-900/5" />
        <div className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-stone-900/5" />
      </div>
    );
  }

  if (product === null) {
    return (
      <EmptyState
        iconName="box"
        title="Produk tidak ditemukan"
        description="Produk ini mungkin sudah dihapus. Kembali ke daftar produk untuk melihat semua produk warung Anda."
      >
        <LinkButton href="/produk" className="mt-2">
          Kembali ke Daftar Produk
        </LinkButton>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white">
            {product.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-stone-900">{product.name}</h2>
            {product.category ? (
              <span className="mt-1 inline-block rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
                {product.category}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-stone-400">
          Informasi Produk
        </h3>
        <dl className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-stone-500">Barcode</dt>
            <dd className="flex min-w-0 items-center gap-1.5 font-semibold text-stone-900">
              <Icon name="barcode" className="h-4 w-4 shrink-0 text-stone-400" />
              <span className="truncate">{product.barcode ?? "—"}</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-stone-500">Harga Jual</dt>
            <dd className="font-bold text-brand-700">{formatIDR(product.currentPrice)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-stone-500">Stok</dt>
            <dd className="font-bold text-stone-900">
              {formatNumberID(product.stock)} {product.unit}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex gap-2">
        <LinkButton href={`/produk/${product.id}/ubah`} className="flex-1">
          Edit Produk
        </LinkButton>
        <Link
          href="/produk"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 active:opacity-80"
        >
          Daftar
        </Link>
      </div>
    </div>
  );
}
