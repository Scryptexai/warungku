"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/AppProviders";
import { useCart } from "@/components/providers/CartProvider";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { Icon } from "@/components/ui/icons";
import type { PaymentType, Product, SyncState } from "@/domain";
import { formatIDR, formatNumberID } from "@/lib/money";
import { ScannerView } from "./ScannerView";
import { ScanResultSheet, type ScanResult } from "./ScanResultSheet";
import { PriceEditSheet } from "./PriceEditSheet";
import { PaymentSheet } from "./PaymentSheet";
import { SaleResultSheet } from "./SaleResultSheet";
import { findMasterByBarcode } from "@/data/master/master-products";
import { lookupBarcodeOnline } from "@/services/openfoodfacts.service";

type View = "entry" | "pay" | "result";

/**
 * LAYAR TRANSAKSI BARU (§5A — input transaksi kecepatan tinggi).
 *
 * SATU layar untuk seluruh proses — meniru alur warung nyata (pemilik
 * mencatat nama barang cepat, harga dihitah belakangan):
 *
 *   ketik "ind" → ketuk hasil → langsung masuk daftar (jumlah nyambung)
 *   → ketik lagi → ketuk → … → (kapan pun) ubah jumlah / harga baris
 *   → TUNAI / BON → konfirmasi → simpan.
 *
 * Scan barcode = METODE INPUT kedua pada layar yang sama (tombol Scan);
 * barang terdaftar langsung masuk daftar tanpa dialog. Barcode tak
 * dikenal → kartu tambah produk (strategi penuh ditangani Tahap 5B).
 */
export function ScanScreen() {
  const { products, sales, sync } = useApp();
  const cart = useCart();
  const catalog = useCatalog();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState<View>("entry");
  const [query, setQuery] = useState("");
  const [scanMode, setScanMode] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [saleResult, setSaleResult] = useState<{
    total: number;
    paymentType: PaymentType;
    customerName: string | null;
    sync: { state: SyncState; queuedCount: number };
  } | null>(null);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  /** §5A: tombol TUNAI/BON membuka langkah pembayaran yang sesuai. */
  const [paymentPreset, setPaymentPreset] = useState<PaymentType | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const flashTimer = useRef<number | null>(null);
  const lastScan = useRef<{ code: string; at: number } | null>(null);

  useEffect(() => {
    void catalog.ensureLocal();
  }, [catalog]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  /** Umpan balik "✓ barang masuk" singkat di atas daftar. */
  function showFlash(text: string) {
    setFlash(text);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1600);
  }

  /** Tambah produk + bersihkan pencarian + fokus balik ke input (0 dialog). */
  const addAndContinue = useCallback(
    (product: Product, quantity = 1) => {
      const existing = cart.items.find((entry) => entry.productId === product.id);
      const nextQty = (existing?.quantity ?? 0) + quantity;
      cart.addProduct(product, quantity);
      showFlash(`✓ ${product.name} ×${nextQty}`);
      setQuery("");
      inputRef.current?.focus();
    },
    [cart],
  );

  /**
   * Barcode → barang. Produk terdaftar → LANGSUNG masuk daftar (tanpa
   * dialog jumlah — §5A "found → added immediately"); jumlah diatur cepat
   * lewat stepper di daftar. Tak dikenal → kartu tambah produk berlapis
   * (master offline → Open Food Facts → manual).
   */
  const handleCode = useCallback(
    async (code: string) => {
      // Cegah barcode yang sama terbaca berulang dalam 2 detik.
      const now = Date.now();
      if (
        lastScan.current &&
        lastScan.current.code === code &&
        now - lastScan.current.at < 2000
      ) {
        return;
      }
      lastScan.current = { code, at: now };

      const product = await products.getProductByBarcode(code);
      if (product) {
        addAndContinue(product);
        setScanKey((key) => key + 1); // reset decoder untuk barang berikutnya
        return;
      }
      const masterHit = findMasterByBarcode(code);
      if (masterHit) {
        setScanResult({ kind: "master", suggestion: { ...masterHit, source: "master" } });
        return;
      }
      setLookingUp(true);
      const online = await lookupBarcodeOnline(code);
      setLookingUp(false);
      if (online) {
        setScanResult({ kind: "master", suggestion: online });
        return;
      }
      setScanResult({ kind: "not-found", barcode: code });
    },
    [products, addAndContinue],
  );

  // Produk baru dari alur tambah (?added=<id>) → langsung masuk daftar.
  const addedId = searchParams.get("added");
  useEffect(() => {
    if (!addedId) return;
    let active = true;
    void products.getProductById(addedId).then((product) => {
      if (!active || !product) return;
      addAndContinue(product);
      router.replace("/scan");
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addedId]);

  // Hasil pencarian instan dari cache sesi (tanpa jaringan, tanpa jeda).
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = catalog.products ?? [];
    if (!q) return [];
    return list
      .filter(
        (product) =>
          product.name.toLowerCase().includes(q) ||
          (product.barcode ?? "").includes(q.replace(/\s+/g, "")),
      )
      .slice(0, 6);
  }, [catalog.products, query]);

  const priceEditItem = cart.items.find((item) => item.productId === priceEditId) ?? null;

  async function handlePay(paymentType: PaymentType, customerName?: string) {
    if (saving) return; // cegah submit ganda
    setSaving(true);
    setSaleError(null);
    try {
      const result = await sales.recordSale({
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          // Harga khusus transaksi ikut sebagai snapshot (master tak berubah).
          unitPrice: item.priceOverridden ? item.unitPrice : undefined,
        })),
        paymentType,
        customerName,
      });
      setSaleResult({
        total: result.transaction.total,
        paymentType,
        customerName: customerName ?? null,
        sync: result.sync,
      });
      setView("result");
    } catch (error) {
      setSaleError(
        error instanceof Error ? error.message : "Gagal menyimpan transaksi. Coba lagi.",
      );
      setView("entry");
    } finally {
      setSaving(false);
    }
  }

  async function handleRetrySync() {
    if (!saleResult) return;
    setRetrying(true);
    try {
      await sync.syncNow();
      // Ambil status antrean TERKINI setelah pengiriman manual (§5B).
      const status = sync.getStatus();
      setSaleResult({
        ...saleResult,
        sync: { state: status.state, queuedCount: status.queuedCount },
      });
    } finally {
      setRetrying(false);
    }
  }

  function handleDone() {
    cart.clear();
    setSaleResult(null);
    setSaleError(null);
    setView("entry");
    setScanResult(null);
    setScanKey((key) => key + 1);
    // Transaksi berikutnya bisa langsung dimulai: fokus ke pencarian.
    window.setTimeout(() => inputRef.current?.focus(), 50);
    // Stok berubah setelah transaksi — segarkan cache sesi (murah).
    void catalog.reloadLocal();
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-stone-100">
      {/* Header + input utama */}
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white px-4 pb-3 pt-5">
        <div className="mx-auto w-full max-w-lg">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Tutup transaksi"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-600 active:bg-stone-200"
            >
              <Icon name="close" className="h-5 w-5" />
            </Link>
            <h1 className="text-base font-bold text-stone-900">Transaksi Baru</h1>
            {cart.count > 0 ? (
              <span className="ml-auto rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white">
                {cart.count} barang
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ketik nama barang… (cth. ind)"
                autoFocus
                autoComplete="off"
                aria-label="Cari barang untuk transaksi"
                className="min-h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setScanMode((mode) => !mode);
                setScanKey((key) => key + 1);
              }}
              aria-pressed={scanMode}
              className={
                scanMode
                  ? "inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white active:opacity-80"
                  : "inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 active:opacity-80"
              }
            >
              <Icon name="barcode" className="h-5 w-5" />
              Scan
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-44 pt-3">
        {/* Mode scan kamera — metode input kedua pada layar yang sama */}
        {scanMode ? (
          <div className="space-y-2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-stone-950">
              <ScannerView key={scanKey} onCode={handleCode} />
              <div className="pointer-events-none absolute inset-6">
                <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 border-brand-400" />
                <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-2xl border-r-4 border-t-4 border-brand-400" />
                <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-2xl border-b-4 border-l-4 border-brand-400" />
                <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 border-brand-400" />
                <span className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse rounded bg-brand-400/70" />
              </div>
              {scanResult !== null || lookingUp ? (
                <div className="absolute inset-0 bg-stone-950/70" />
              ) : null}
            </div>
            <p className="text-center text-xs text-stone-500">
              Barang terdaftar langsung masuk daftar — terus scan barang berikutnya.
            </p>
            {manualOpen ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const code = manualCode.trim();
                  if (!code) {
                    setManualError("Masukkan kode barcode terlebih dahulu.");
                    return;
                  }
                  setManualError(null);
                  void handleCode(code);
                }}
                className="flex gap-2"
              >
                <input
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                  placeholder="Ketik kode barcode"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label="Kode barcode manual"
                  className="min-h-12 flex-1 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none"
                />
                <button
                  type="submit"
                  className="min-h-12 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white active:opacity-80"
                >
                  Cari
                </button>
                {manualError ? (
                  <p className="sr-only" role="alert">
                    {manualError}
                  </p>
                ) : null}
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="mx-auto flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-semibold text-stone-600 ring-1 ring-stone-200"
              >
                <Icon name="barcode" className="h-4 w-4" />
                Kode manual
              </button>
            )}
            {manualError ? (
              <p className="text-center text-xs text-red-600" role="alert">
                {manualError}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Hasil pencarian instan — ketuk = masuk daftar (tanpa buka detail) */}
        {query.trim() ? (
          <div className="space-y-1.5">
            {results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addAndContinue(product)}
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
                    {product.category ? ` · ${product.category}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold text-brand-700">
                    {formatIDR(product.currentPrice)}
                  </span>
                  <span className="text-[10px] font-semibold text-stone-400">+ Tambah</span>
                </span>
              </button>
            ))}
            {/* Barang tidak ada → tambah produk baru, lalu lanjut transaksi */}
            <Link
              href={`/produk/tambah?nama=${encodeURIComponent(query.trim())}&alur=scan`}
              className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-brand-400 bg-brand-50/60 text-sm font-semibold text-brand-700 active:opacity-80"
            >
              <Icon name="plus" className="h-4 w-4" />
              Tambah Produk “{query.trim()}”
            </Link>
          </div>
        ) : null}

        {flash ? (
          <p
            role="status"
            className="mt-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-800"
          >
            {flash}
          </p>
        ) : null}

        {/* Daftar barang transaksi — jumlah & harga diatur cepat di sini */}
        {cart.items.length > 0 ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-sm font-bold text-stone-700">Belanja</h2>
              <span className="text-[11px] text-stone-400">
                {cart.items.length} jenis · {cart.count} barang
              </span>
            </div>
            {cart.items.map((item) => (
              <div
                key={item.productId}
                className="rounded-2xl border border-stone-200 bg-white p-3"
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-stone-900">{item.name}</p>
                    <p className="text-[11px] text-stone-400">
                      {item.quantity} × {formatIDR(item.unitPrice)} ={" "}
                      <span className="font-bold text-stone-700">
                        {formatIDR(item.quantity * item.unitPrice)}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Hapus ${item.name}`}
                    onClick={() => cart.removeItem(item.productId)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 active:bg-red-100"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Kurangi ${item.name}`}
                      onClick={() => cart.setQuantity(item.productId, item.quantity - 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-lg font-bold text-stone-700 active:bg-stone-200"
                    >
                      &minus;
                    </button>
                    <span className="min-w-8 text-center text-base font-bold text-stone-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Tambah ${item.name}`}
                      onClick={() => cart.setQuantity(item.productId, item.quantity + 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white active:opacity-80"
                    >
                      <Icon name="plus" className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPriceEditId(item.productId)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-stone-100 px-3 text-sm font-bold text-stone-800 active:bg-stone-200"
                  >
                    <Icon name="tag" className="h-4 w-4 text-stone-500" />
                    {formatIDR(item.unitPrice)}
                    {item.priceOverridden ? (
                      <span className="text-[10px] font-bold text-amber-600">diubah</span>
                    ) : null}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : !query.trim() && !scanMode ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-4 py-8 text-center">
            <Icon name="cart" className="h-8 w-8 text-stone-300" />
            <p className="text-sm font-semibold text-stone-600">
              Ketik nama barang untuk mulai
            </p>
            <p className="max-w-[34ch] text-xs leading-relaxed text-stone-400">
              cth. “ind” → Indomie. Ketuk hasil → langsung masuk daftar → ketik
              barang berikutnya. Bisa juga tekan Scan untuk barcode.
            </p>
          </div>
        ) : null}
      </div>

      {/* Footer: total + TUNAI / BON — selalu terlihat (§5A) */}
      {cart.count > 0 && view === "entry" ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white px-4 pb-6 pt-3">
          <div className="mx-auto w-full max-w-lg">
            {saleError ? (
              <p
                role="alert"
                className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
              >
                {saleError}
              </p>
            ) : null}
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-semibold text-stone-500">Total</span>
              <span className="text-xl font-bold text-stone-900">{formatIDR(cart.total)}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentPreset("CASH");
                  setView("pay");
                }}
                className="inline-flex min-h-14 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-sm font-bold text-white active:opacity-80"
              >
                <Icon name="cart" className="h-5 w-5" />
                TUNAI
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentPreset("BON");
                  setView("pay");
                }}
                className="inline-flex min-h-14 flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-sm font-bold text-white active:opacity-80"
              >
                <Icon name="receipt" className="h-5 w-5" />
                BON
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lookingUp ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60">
          <div className="animate-sheet-up w-full max-w-lg rounded-t-3xl bg-white p-6 pb-8 text-center">
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-brand-600" />
            <p className="mt-3 text-sm font-bold text-stone-900">
              Mencari di database produk…
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Open Food Facts (2 juta+ produk) — butuh internet sebentar.
            </p>
          </div>
        </div>
      ) : null}

      {scanResult !== null && view === "entry" ? (
        <ScanResultSheet
          result={scanResult}
          onAddToCart={(product, quantity) => {
            addAndContinue(product, quantity);
            setScanResult(null);
            setScanKey((key) => key + 1);
          }}
          onScanAgain={() => {
            setScanResult(null);
            setScanKey((key) => key + 1);
          }}
        />
      ) : null}

      {priceEditItem ? (
        <PriceEditSheet
          productName={priceEditItem.name}
          currentPrice={priceEditItem.unitPrice}
          masterPrice={
            catalog.products?.find((p) => p.id === priceEditItem.productId)?.currentPrice ??
            priceEditItem.unitPrice
          }
          onSave={(price) => {
            cart.setUnitPrice(priceEditItem.productId, price);
            setPriceEditId(null);
          }}
          onClose={() => setPriceEditId(null)}
        />
      ) : null}

      {view === "pay" ? (
        <PaymentSheet
          saving={saving}
          initialPaymentType={paymentPreset ?? undefined}
          onClose={() => {
            setPaymentPreset(null);
            setView("entry");
          }}
          onSubmit={handlePay}
        />
      ) : null}

      {view === "result" && saleResult ? (
        <SaleResultSheet
          total={saleResult.total}
          paymentType={saleResult.paymentType}
          customerName={saleResult.customerName}
          sync={saleResult.sync}
          retrying={retrying}
          onRetrySync={handleRetrySync}
          onDone={handleDone}
        />
      ) : null}
    </div>
  );
}
