"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";

/**
 * Kerangka layar Produk: pencarian + tombol tambah + keadaan kosong.
 * Basis data produk & barcode aktif di Tahap 2.
 */
export function ProductsScreen() {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState(false);

  const trimmed = query.trim();

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
          />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setNotice(false);
            }}
            placeholder="Cari produk…"
            aria-label="Cari produk"
            className="min-h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400"
          />
        </div>
        <Button onClick={() => setNotice(true)} className="px-3.5">
          <Icon name="plus" className="h-5 w-5" />
          Tambah
        </Button>
      </div>

      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800"
        >
          Form tambah produk hadir di Tahap 2 — bersama pemindaian barcode. Cukup
          scan barang baru, form-nya muncul otomatis.
        </p>
      ) : null}

      {trimmed ? (
        <EmptyState
          iconName="box"
          title="Tidak ada produk yang cocok"
          description={`Belum ada produk dengan nama “${trimmed}”. Produk mulai bisa ditambahkan pada Tahap 2.`}
        />
      ) : (
        <EmptyState
          iconName="box"
          title="Belum ada produk"
          description="Mulai Tahap 2, cukup scan barcode barang — form tambah produk muncul otomatis. Harga dan stok mudah diubah kapan saja."
        />
      )}
    </div>
  );
}
