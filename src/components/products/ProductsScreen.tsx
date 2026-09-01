"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";
import type { Product } from "@/domain";
import { formatIDR, formatNumberID } from "@/lib/money";
import { computeBulkPrice } from "@/lib/pricing";
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

/** Baris produk dalam MODE PILIH — ketuk untuk mencentang. */
function SelectableRow({
  product,
  checked,
  onToggle,
}: {
  product: Product;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 active:bg-stone-50",
        checked ? "ring-2 ring-brand-500" : "ring-stone-900/5",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2",
          checked ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300",
        )}
      >
        {checked ? <Icon name="check" className="h-4 w-4" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-stone-900">
          {product.name}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-stone-400">
          {product.category ?? ""}
        </span>
      </span>
      <span className="shrink-0 text-sm font-bold text-brand-700">
        {formatIDR(product.currentPrice)}
      </span>
    </button>
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
 * Layar Produk — data dari CACHE SESI (CatalogProvider).
 * Fitur: cari, FILTER KATEGORI (pilih beberapa sekaligus), IMPOR CSV,
 * dan MODE PILIH → ubah harga massal (mis. semua Makanan Instan +10%).
 */
export function ProductsScreen() {
  const { products } = useApp();
  const { products: catalogProducts, ensureLocal, refreshFromSheets, lastSheetsFetchAt, reloadLocal } =
    useCatalog();
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedReport, setSeedReport] = useState<string | null>(null);
  const [stockBusy, setStockBusy] = useState(false);

  // Filter kategori — bisa pilih beberapa sekaligus.
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  // Mode pilih untuk ubah harga massal.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [percent, setPercent] = useState(10);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [confirming, setConfirming] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDone, setBulkDone] = useState<number | null>(null);
  const [bulkError, setBulkError] = useState(false);

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

  /**
   * Tambah produk master offline (barcode nyata §5D) ke katalog lokal
   * (idempotent by barcode).
   * Aman dipanggil berkali-kali: barcode yang sudah ada dilewati, bukan
   * diduplikasi. Antrean sinkron kirim ke Google Sheets saat token hidup.
   * Pesan ringkas ditampilkan di atas daftar (menghilang sendiri).
   */
  async function handleSeedFromMaster() {
    if (seeding) return;
    setSeeding(true);
    setSeedReport(null);
    try {
      const result = await products.seedFromMaster();
      const created = result.created.length;
      const skipped = result.skippedExisting.length;
      const failed = result.failedRows.length;
      reloadLocal();
      setSeedReport(
        created > 0
          ? `✓ ${created} produk master ditambahkan.`
          : skipped > 0
            ? `Semua ${skipped} produk master sudah ada di katalog.`
            : `Tidak ada produk yang ditambahkan (${failed} baris gagal).`,
      );
    } catch {
      setSeedReport("Gagal menambah master. Coba lagi.");
    } finally {
      setSeeding(false);
      window.setTimeout(() => setSeedReport(null), 4000);
    }
  }

  /**
   * Tombol dev: set stok = 100 untuk SEMUA produk sekaligus. Idempotent.
   * Berguna saat founder sudah menyalin master ke katalog dan ingin semua
   * barang tampil dengan stok awal yang seragam. Tidak menimpa transaksi
   * (transaksi membawa snapshot qty sendiri).
   */
  async function handleSetStockAll() {
    if (stockBusy) return;
    if (catalogProducts === null || catalogProducts.length === 0) return;
    setStockBusy(true);
    setSeedReport(null);
    try {
      const result = await products.bulkSetStockForAll(100);
      reloadLocal();
      setSeedReport(
        result.updated > 0
          ? `✓ Stok = ${result.value} diterapkan ke ${result.updated} produk.`
          : "Katalog kosong — set stok dilewati.",
      );
    } catch {
      setSeedReport("Gagal mengatur stok. Coba lagi.");
    } finally {
      setStockBusy(false);
      window.setTimeout(() => setSeedReport(null), 4000);
    }
  }

  const trimmed = query.trim();
  const categories = useMemo(() => {
    if (catalogProducts === null) return [];
    const counts = new Map<string, number>();
    for (const product of catalogProducts) {
      const key = product.category?.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"))
      .map(([name]) => name);
  }, [catalogProducts]);

  const filtered = useMemo(() => {
    if (catalogProducts === null) return null;
    let list = catalogProducts;
    if (activeCategories.length > 0) {
      const active = new Set(activeCategories);
      list = list.filter((product) => active.has(product.category ?? ""));
    }
    if (trimmed) {
      const q = trimmed.toLowerCase();
      list = list.filter(
        (product) =>
          product.name.toLowerCase().includes(q) ||
          (product.category ?? "").toLowerCase().includes(q) ||
          (product.barcode ?? "").includes(q.replace(/\s+/g, "")),
      );
    }
    return list;
  }, [catalogProducts, activeCategories, trimmed]);

  const selectedProducts = useMemo(() => {
    if (catalogProducts === null || selectedIds.length === 0) return [];
    const ids = new Set(selectedIds);
    return catalogProducts.filter((product) => ids.has(product.id));
  }, [catalogProducts, selectedIds]);

  const change = {
    kind: "percent" as const,
    value: direction === "up" ? percent : -percent,
  };

  /** Pratinjau harga pertama terpilih — supaya user lihat efeknya. */
  const preview =
    selectedProducts.length > 0
      ? {
          name: selectedProducts[0].name,
          oldPrice: selectedProducts[0].currentPrice,
          newPrice: computeBulkPrice(selectedProducts[0].currentPrice, change),
        }
      : null;

  function toggleCategory(name: string) {
    setActiveCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  }

  function toggleProduct(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    if (filtered === null || filtered.length === 0) return;
    const allSelected =
      selectedIds.length === filtered.length &&
      filtered.every((product) => selectedIds.includes(product.id));
    setSelectedIds(allSelected ? [] : filtered.map((product) => product.id));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds([]);
    setConfirming(false);
    setPercent(10);
    setDirection("up");
  }

  async function applyBulkPrice() {
    setBulkBusy(true);
    setBulkError(false);
    try {
      const updated = await products.bulkUpdatePrices(selectedIds, change);
      setBulkDone(updated.length);
      setConfirming(false);
      reloadLocal();
      if (updated.length > 0) void refreshFromSheets();
      exitSelectMode();
    } catch {
      setBulkError(true);
      setConfirming(false);
    } finally {
      setBulkBusy(false);
    }
  }

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
        {selectMode ? (
          <button
            type="button"
            onClick={exitSelectMode}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3.5 text-sm font-semibold text-red-600 active:opacity-80"
          >
            Batal
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              aria-label="Pilih beberapa produk untuk ubah harga massal"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-600 active:opacity-80"
            >
              <Icon name="check" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void handleSeedFromMaster()}
              disabled={seeding}
              aria-label="Impor produk master offline (barcode nyata) ke katalog"
              title="Impor produk master offline (barcode nyata, idempotent)"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-600 active:opacity-80 disabled:opacity-50"
            >
              <Icon name="upload" className={cn("h-5 w-5", seeding && "animate-pulse")} />
            </button>
            <button
              type="button"
              onClick={() => void handleSetStockAll()}
              disabled={stockBusy || (catalogProducts?.length ?? 0) === 0}
              aria-label="Set stok = 100 untuk semua produk"
              title="Set stok = 100 untuk semua produk (idempotent, sekali jalan)"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-600 active:opacity-80 disabled:opacity-50"
            >
              <Icon name="box" className={cn("h-5 w-5", stockBusy && "animate-pulse")} />
            </button>
            <Link
              href="/produk/tambah"
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-white active:opacity-80"
            >
              <Icon name="plus" className="h-5 w-5" />
              Tambah
            </Link>
          </>
        )}
      </div>

      {seedReport ? (
        <p
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800"
        >
          {seedReport}
        </p>
      ) : null}

      {/* Filter kategori — pilih beberapa sekaligus */}
      {categories.length > 1 ? (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          <button
            type="button"
            onClick={() => setActiveCategories([])}
            className={cn(
              "min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors",
              activeCategories.length === 0
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-stone-200 bg-white text-stone-600",
            )}
          >
            Semua
          </button>
          {categories.map((name) => {
            const active = activeCategories.includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleCategory(name)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors",
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-stone-200 bg-white text-stone-600",
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      ) : null}

      {filtered !== null ? (
        <p className="flex flex-wrap items-center gap-x-1.5 px-0.5 text-xs text-stone-400">
          <span>
            {filtered.length} dari {catalogProducts?.length ?? 0} produk
          </span>
          {activeCategories.length > 0 ? (
            <span className="text-stone-300">
              · {activeCategories.length} kategori dipilih
            </span>
          ) : null}
          {sheetsLabel ? (
            <span className="text-stone-300">· Google Sheets {sheetsLabel}</span>
          ) : null}
        </p>
      ) : null}

      {bulkDone !== null ? (
        <p
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs font-semibold text-brand-800"
        >
          Harga {bulkDone} produk berhasil diperbarui. Harga pada transaksi
          lama tidak berubah.
          <button
            type="button"
            onClick={() => setBulkDone(null)}
            className="ml-1 underline"
          >
            Tutup
          </button>
        </p>
      ) : null}

      {bulkError ? (
        <p
          role="status"
          className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700"
        >
          Gagal mengubah harga. Tidak ada data yang berubah — coba lagi.
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

      {selectMode && filtered !== null && filtered.length > 0 ? (
        <button
          type="button"
          onClick={toggleSelectAll}
          className="min-h-10 w-full rounded-xl border border-dashed border-stone-300 bg-white text-xs font-semibold text-stone-600 active:opacity-80"
        >
          {filtered.length === selectedIds.length && selectedIds.length > 0
            ? "Batalkan pilihan semua"
            : `Pilih semua (${filtered.length})`}
        </button>
      ) : null}

      <div className="space-y-2">
        {filtered === null ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : filtered.length === 0 ? (
          trimmed || activeCategories.length > 0 ? (
            <EmptyState
              iconName="box"
              title="Produk tidak ditemukan"
              description="Tidak ada produk yang cocok dengan pencarian atau filter kategori. Coba kata lain, atau tambah produk baru."
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
              <Link
                href="/produk/impor"
                className="mt-1.5 inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 active:opacity-80"
              >
                <Icon name="upload" className="mr-1.5 h-4 w-4" />
                Impor dari CSV
              </Link>
            </EmptyState>
          )
        ) : selectMode ? (
          filtered.map((product) => (
            <SelectableRow
              key={product.id}
              product={product}
              checked={selectedIds.includes(product.id)}
              onToggle={() => toggleProduct(product.id)}
            />
          ))
        ) : (
          filtered.map((product) => <ProductRow key={product.id} product={product} />)
        )}
      </div>

      {!selectMode ? (
        <>
          <p className="pt-1 text-center text-[11px] text-stone-400">
            Ketuk produk untuk melihat detail &amp; mengubah harga / stok / satuan
          </p>
          <Link
            href="/produk/impor"
            className="mx-auto flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 bg-white px-4 text-xs font-semibold text-stone-600 active:opacity-80"
          >
            <Icon name="upload" className="h-4 w-4" />
            Impor banyak produk dari CSV
          </Link>
        </>
      ) : null}

      {/* Panel aksi massal — muncul hanya di mode pilih */}
      {selectMode ? (
        <>
          <div className="h-44" aria-hidden />
          <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg rounded-t-3xl bg-white p-4 pb-28 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-bold text-stone-900">
              {selectedIds.length} produk dipilih
            </p>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex rounded-xl bg-stone-100 p-1">
                {(["up", "down"] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setDirection(dir)}
                    className={cn(
                      "min-h-10 rounded-lg px-3 text-xs font-bold transition-colors",
                      direction === dir
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-500",
                    )}
                  >
                    {dir === "up" ? "Naikkan" : "Turunkan"}
                  </button>
                ))}
              </div>
              <div className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-stone-100 px-2">
                <button
                  type="button"
                  aria-label="Kurangi persen"
                  onClick={() => setPercent((p) => Math.max(1, p - 5))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-stone-600 active:bg-stone-200"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={percent}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setPercent(Math.min(100, Math.max(1, Number.isFinite(value) ? Math.round(value) : 1)));
                  }}
                  aria-label="Persen perubahan harga"
                  className="w-14 bg-transparent text-center text-sm font-bold text-stone-900 outline-none"
                />
                <span className="text-sm font-bold text-stone-600">%</span>
                <button
                  type="button"
                  aria-label="Tambah persen"
                  onClick={() => setPercent((p) => Math.min(100, p + 5))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-stone-600 active:bg-stone-200"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-2 flex gap-1.5">
              {[5, 10, 15, 25].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPercent(preset)}
                  className={cn(
                    "min-h-9 flex-1 rounded-full border text-xs font-semibold",
                    percent === preset
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-stone-200 bg-white text-stone-600",
                  )}
                >
                  {preset}%
                </button>
              ))}
            </div>

            {preview ? (
              <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                Contoh: <span className="font-semibold text-stone-800">{preview.name}</span>{" "}
                {formatIDR(preview.oldPrice)} →{" "}
                <span className="font-bold text-brand-700">{formatIDR(preview.newPrice)}</span>{" "}
                (dibulatkan ke ratusan)
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-stone-400">
                Ketuk produk di atas untuk memilih…
              </p>
            )}

            <button
              type="button"
              disabled={selectedIds.length === 0 || bulkBusy}
              onClick={() => setConfirming(true)}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80 disabled:opacity-40"
            >
              <Icon name="tag" className="h-5 w-5" />
              Ubah Harga {selectedIds.length > 0 ? `${selectedIds.length} Produk` : ""}
            </button>
          </div>

          {/* Konfirmasi eksplisit sebelum mengubah harga massal */}
          {confirming ? (
            <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60">
              <div className="animate-sheet-up w-full max-w-lg rounded-t-3xl bg-white p-5 pb-8">
                <h3 className="text-sm font-bold text-stone-900">
                  Ubah harga {selectedIds.length} produk?
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">
                  Harga akan{" "}
                  <span className="font-bold">
                    {direction === "up" ? "naik" : "turun"} {percent}%
                  </span>{" "}
                  dan dibulatkan ke ratusan rupiah.
                  {preview ? (
                    <>
                      {" "}
                      Contoh: {preview.name} {formatIDR(preview.oldPrice)} →{" "}
                      {formatIDR(preview.newPrice)}.
                    </>
                  ) : null}{" "}
                  Transaksi yang sudah tersimpan TIDAK berubah — mereka menyimpan
                  harga saat transaksi terjadi.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void applyBulkPrice()}
                    disabled={bulkBusy}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80 disabled:opacity-50"
                  >
                    {bulkBusy ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Icon name="check" className="h-5 w-5" />
                    )}
                    {bulkBusy ? "Menyimpan…" : "Ya, Ubah Harga"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={bulkBusy}
                    className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-700 active:opacity-80"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
