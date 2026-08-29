"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { useCart } from "@/components/providers/CartProvider";
import { Icon } from "@/components/ui/icons";
import type { Product } from "@/domain";
import { formatIDR, formatNumberID } from "@/lib/money";

/**
 * Pencarian produk manual — pintu masuk transaksi tanpa scan (§1):
 * ketik nama/barcode/kategori → ketuk produk → langsung masuk keranjang.
 */
export function ProductSearchSheet({ onClose }: { onClose: () => void }) {
  const { products } = useApp();
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void products.searchProducts(query).then((items) => {
      if (active) setResults(items.slice(0, 8));
    });
    return () => {
      active = false;
    };
  }, [products, query]);

  function handlePick(product: Product) {
    cart.addProduct(product, 1);
    setAdded(product.name);
    window.setTimeout(() => setAdded(null), 1800);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60">
      <div className="animate-sheet-up max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-7">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Cari Produk</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pencarian"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 active:bg-stone-200"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-3">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nama, barcode, atau kategori…"
            autoFocus
            aria-label="Cari produk untuk transaksi"
            className="min-h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400"
          />
        </div>

        {added ? (
          <p
            role="status"
            className="mt-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800"
          >
            ✓ {added} masuk keranjang — atur jumlah di daftar belanja.
          </p>
        ) : null}

        <div className="mt-3 space-y-2">
          {results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-200 px-3 py-6 text-center text-xs text-stone-400">
              {query.trim()
                ? `Produk "${query.trim()}" tidak ditemukan.`
                : "Ketik untuk mencari produk warung Anda."}
            </p>
          ) : (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handlePick(product)}
                className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-left active:bg-stone-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
                  {product.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-stone-900">
                    {product.name}
                  </span>
                  <span className="block text-[11px] text-stone-400">
                    Stok {formatNumberID(product.stock)} {product.unit}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold text-brand-700">
                    {formatIDR(product.currentPrice)}
                  </span>
                  <span className="text-[10px] font-semibold text-stone-400">+ Keranjang</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
