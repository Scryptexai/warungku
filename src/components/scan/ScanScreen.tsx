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
import { CartBar } from "./CartBar";
import { PaymentSheet } from "./PaymentSheet";
import { SaleResultSheet } from "./SaleResultSheet";
import { findMasterByBarcode } from "@/data/master/master-products";

type View = "input" | "pay" | "result";

/**
 * PHASE 5C — Rapid Transaction UX.
 *
 * Layar transaksi SINGLE-SURFACE: scan + search + quick products + cart
 * ringkas semuanya hadir pada satu halaman tanpa modal yang menutupi.
 * Spesifikasi (sumber: instruction Phase 5C):
 *   - §4 Barcode ketemu → langsung +1 ke cart, tanpa sheet konfirmasi.
 *   - §5-6 Search field menonjol, tap hasil = +1, field TIDAK kehilangan
 *        fokus, kontinyu mengetik produk berikutnya.
 *   - §7 Quick Products (subset master) — tap = +1, tanpa dialog.
 *   - §8 Cart selalu terlihat, [-] qty [+] inline, repeat = +qty.
 *   - §9 Tidak ada product-detail interruption.
 *   - §10 PaymentFlow dipicu setelah entry, dari tombol "Bayar" besar.
 *
 * Yang TIDAK berubah: CartProvider (idempotent by productId), SaleService,
 * PaymentSheet, SaleResultSheet, ScanResultSheet (dipakai untuk produk
 * master/online/not-found saja).
 */
export function ScanScreen() {
  const { products, sales, sync } = useApp();
  const cart = useCart();
  const catalog = useCatalog();
  const router = useRouter();
  const searchParams = useSearchParams();

  const payIntent = searchParams.get("pay");
  const initialPaymentType: PaymentType | undefined =
    payIntent === "bon" ? "BON" : payIntent === "cash" ? "CASH" : undefined;
  const isBonIntent = payIntent === "bon";

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const [view, setView] = useState<View>("input");
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [saleResult, setSaleResult] = useState<{
    total: number;
    paymentType: PaymentType;
    customerName: string | null;
    sync: { state: SyncState; queuedCount: number };
  } | null>(null);
  const [query, setQuery] = useState("");
  /** Ref agar handler CartProvider.addProduct tidak menutup fokus input. */
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  /** Barcode → produk. Dikenali → langsung +1. Tidak dikenali → sheet. */
  const handleCode = useCallback(
    async (code: string) => {
      const product = await products.getProductByBarcode(code);
      if (product) {
        cart.addProduct(product, 1);
        return;
      }
      const master = findMasterByBarcode(code);
      if (master) {
        setScanResult({
          kind: "master",
          suggestion: {
            barcode: master.barcode,
            name: master.name,
            category: master.category,
            unit: master.unit,
            suggestedPrice: master.suggestedPrice,
            source: "master",
          },
        });
        return;
      }
      setScanResult({ kind: "not-found", barcode: code });
    },
    [products, cart],
  );

  // Produk baru dari alur scan (?added=<id>) → langsung masuk keranjang.
  const addedId = searchParams.get("added");
  useEffect(() => {
    if (!addedId) return;
    let active = true;
    void products.getProductById(addedId).then((product) => {
      if (!active || !product) return;
      cart.addProduct(product, 1);
      router.replace("/scan");
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addedId]);

  function handleScanAgain() {
    setScanResult(null);
    setScanKey((key) => key + 1);
  }

  async function handlePay(paymentType: PaymentType, customerName?: string) {
    if (saving) return;
    setSaving(true);
    try {
      const result = await sales.recordSale({
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
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
      // PaymentSheet menangkap error dari sisi PaymentSheet (parent
      // tidak perlu menampilkan banner lagi — duplikasi).
      console.warn("[warungku] Gagal simpan transaksi:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleRetrySync() {
    if (!saleResult) return;
    setRetrying(true);
    try {
      await sync.syncNow();
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
    setQuery("");
    setView("input");
    handleScanAgain();
    void catalog.reloadLocal();
  }

  /**
   * Tambah produk dari panel search. Jaga fokus & kosongkan query supaya
   * kasir bisa langsung mengetik produk berikutnya tanpa sentuhan tambahan.
   */
  function pickFromSearch(product: Product) {
    cart.addProduct(product, 1);
    setQuery("");
    // Re-focus agar keyboard tetap terbuka dan kursor siap di input.
    searchInputRef.current?.focus();
  }

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 px-4 pb-2 pt-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Tutup layar transaksi"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 active:bg-stone-200"
          >
            <Icon name="close" className="h-5 w-5 text-stone-700" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-tight">Transaksi Baru</h1>
            <p className="text-[11px] text-stone-500">
              {cart.count > 0
                ? `${cart.count} barang · ${formatIDR(cart.total)}`
                : "Tambah barang lewat scan, ketik, atau pilih cepat"}
            </p>
          </div>
          {isBonIntent ? (
            <span className="rounded-full bg-amber-500/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              ● Bon
            </span>
          ) : null}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-32 pt-3">
        {isBonIntent ? (
          <p className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
            Mode Catat Bon — pilih barang lalu ketuk Bayar. Pembayaran otomatis
            terset ke BON.
          </p>
        ) : null}

        {view === "input" ? (
          <InputSurface
            query={query}
            setQuery={setQuery}
            onPickFromSearch={pickFromSearch}
            onScan={handleCode}
            scanKey={scanKey}
            searchInputRef={searchInputRef}
            onAddById={(id) => void products.getProductById(id).then((p) => p && cart.addProduct(p, 1))}
            cart={cart}
          />
        ) : null}

        {view === "result" && saleResult ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
            ✓ Transaksi tersimpan · {formatIDR(saleResult.total)}
          </p>
        ) : null}
      </main>

      {cart.count > 0 && view === "input" ? (
        <div className="fixed inset-x-0 bottom-14 z-20 border-t border-stone-200 bg-white/95 px-4 pb-3 pt-3 backdrop-blur">
          <div className="mx-auto w-full max-w-lg space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>
                {cart.count} barang · {cart.items.length} produk
              </span>
              <span className="text-[11px] font-semibold text-stone-400">
                Geser ke bawah untuk lihat semua
              </span>
            </div>
            <CartBar
              itemCount={cart.count}
              total={cart.total}
              onPay={() => setView("pay")}
            />
          </div>
        </div>
      ) : null}

      {scanResult !== null ? (
        <ScanResultSheet
          result={scanResult}
          onAddToCart={(product, quantity) => {
            cart.addProduct(product, quantity);
            handleScanAgain();
          }}
          onScanAgain={handleScanAgain}
        />
      ) : null}

      {view === "pay" ? (
        <PaymentSheet
          saving={saving}
          onClose={() => setView("input")}
          onSubmit={handlePay}
          initialPaymentType={initialPaymentType}
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

/**
 * Permukaan input single-screen: kamera kecil (atas) + search + quick
 * products + cart ringkas (urut ke bawah). Tidak ada modal.
 */
function InputSurface({
  query,
  setQuery,
  onPickFromSearch,
  onScan,
  scanKey,
  searchInputRef,
  cart,
}: {
  query: string;
  setQuery: (value: string) => void;
  onPickFromSearch: (product: Product) => void;
  onScan: (code: string) => void | Promise<void>;
  scanKey: number;
  searchInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onAddById: (id: string) => void;
  cart: ReturnType<typeof useCart>;
}) {
  const { products: productsList, ensureLocal } = useCatalog();

  useEffect(() => {
    void ensureLocal();
  }, [ensureLocal]);

  // Pakai productsList dari CatalogProvider (sumber kebenaran: local cache).
  // Pencarian match nama/kategori/barcode, in-memory, instan saat mengetik.
  const results = useMemo(() => {
    const list = productsList ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list.slice(0, 8);
    return list
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").includes(q.replace(/\s+/g, "")),
      )
      .slice(0, 8);
  }, [productsList, query]);

  return (
    <div className="space-y-4">
      <CameraStrip scanKey={scanKey} onCode={onScan} />

      <SearchPanel
        query={query}
        setQuery={setQuery}
        searchInputRef={searchInputRef}
        results={results}
        onPick={onPickFromSearch}
      />

      <QuickProducts onPick={onPickFromSearch} />

      {cart.items.length > 0 ? <CartList cart={cart} /> : null}
    </div>
  );
}

function CameraStrip({
  scanKey,
  onCode,
}: {
  scanKey: number;
  onCode: (code: string) => void | Promise<void>;
}) {
  const [manualCode, setManualCode] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  return (
    <section
      aria-label="Area scan barcode"
      className="rounded-2xl bg-stone-950 p-3 text-white ring-1 ring-stone-200"
    >
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-900">
          <ScannerView key={scanKey} onCode={onCode} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold">Arahkan kamera ke barcode</p>
          <p className="mt-0.5 text-[10px] text-white/60">
            Barang dikenal → langsung masuk keranjang.
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
                void onCode(code);
                setManualCode("");
                setManualOpen(false);
              }}
              className="mt-2 flex gap-1.5"
            >
              <input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Ketik kode"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Kode barcode manual"
                className="min-h-9 flex-1 rounded-lg border border-white/20 bg-white/10 px-2 text-xs text-white outline-none placeholder:text-white/40"
              />
              <button
                type="submit"
                className="min-h-9 rounded-lg bg-brand-600 px-3 text-xs font-bold text-white active:opacity-80"
              >
                Cari
              </button>
            </form>
          ) : (
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white/80 active:bg-white/20"
              >
                Kode manual
              </button>
              <Link
                href="/produk/tambah?alur=manual"
                className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white/80 active:bg-white/20"
              >
                Tambah Manual
              </Link>
            </div>
          )}
          {manualError ? (
            <p className="mt-1 text-[10px] text-amber-300" role="alert">
              {manualError}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SearchPanel({
  query,
  setQuery,
  searchInputRef,
  results,
  onPick,
}: {
  query: string;
  setQuery: (value: string) => void;
  searchInputRef: React.MutableRefObject<HTMLInputElement | null>;
  results: Product[];
  onPick: (product: Product) => void;
}) {
  return (
    <section aria-label="Pencarian produk" className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
      <div className="relative">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
        />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ketik nama atau barcode…"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-label="Cari produk untuk transaksi"
          className="min-h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400"
        />
      </div>

      <div className="mt-3 space-y-1.5">
        {query.trim() === "" ? (
          <p className="px-1 py-2 text-center text-[11px] text-stone-400">
            Produk populer muncul di sini saat kamu mulai mengetik.
          </p>
        ) : results.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-200 px-3 py-4 text-center text-xs text-stone-400">
            Produk &ldquo;{query.trim()}&rdquo; tidak ditemukan.
          </p>
        ) : (
          results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onPick(product)}
              className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white p-2.5 text-left active:bg-stone-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                {product.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-stone-900">
                  {product.name}
                </span>
                {product.category ? (
                  <span className="block text-[10px] text-stone-400">
                    {product.category}
                  </span>
                ) : null}
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
    </section>
  );
}

/**
 * QUICK PRODUCTS (§7) — subset statis dari master produk yang paling
 * laku. Bukan analytics/AI; hanya konstante nama → barcode.
 * Data: barcode asli (OFF nyata) sehingga setelah seed master (Phase 5A),
 * produk-produk ini PASTI ada di katalog lokal.
 */
const QUICK_BARCODES: Array<{ barcode: string; label: string }> = [
  { barcode: "8991002101018", label: "Indomie Kari" },
  { barcode: "8991002101001", label: "Indomie Goreng" },
  { barcode: "8886008101019", label: "Aqua 600ml" },
  { barcode: "8993175531019", label: "Teh Pucuk" },
  { barcode: "8991002105019", label: "Gula 1kg" },
  { barcode: "8991388101017", label: "Kopi Sachet" },
  { barcode: "8992696101017", label: "Sampoerna Mild" },
  { barcode: "8991002105033", label: "Minyak 1L" },
];

function QuickProducts({ onPick }: { onPick: (product: Product) => void }) {
  const { products: productsList } = useCatalog();

  const items = useMemo(() => {
    const list = productsList ?? [];
    const byBarcode = new Map<string, Product>();
    for (const p of list) {
      if (p.barcode) byBarcode.set(p.barcode, p);
    }
    return QUICK_BARCODES.map(({ barcode, label }) => {
      const product = byBarcode.get(barcode);
      return product ? { product, label } : null;
    }).filter((x): x is { product: Product; label: string } => x !== null);
  }, [productsList]);

  if (items.length === 0) return null;

  return (
    <section aria-label="Produk cepat" className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500">
          Produk Cepat
        </h2>
        <span className="text-[10px] text-stone-400">1 ketuk = tambah 1</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {items.map(({ product, label }) => (
          <button
            key={product.id}
            type="button"
            onClick={() => onPick(product)}
            className="flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl bg-stone-50 p-2 text-center active:bg-stone-100"
          >
            <span className="truncate text-[11px] font-bold text-stone-900">
              {label}
            </span>
            <span className="text-[10px] font-semibold text-brand-700">
              {formatIDR(product.currentPrice)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * CartList — daftar inline yang SELALU terlihat selama transaksi (§8).
 * Tiap baris punya [-] qty [+] inline; tidak ada halaman terpisah.
 */
function CartList({ cart }: { cart: ReturnType<typeof useCart> }) {
  return (
    <section aria-label="Keranjang" className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500">
          Keranjang ({cart.items.length})
        </h2>
        <span className="text-[10px] text-stone-400">
          {formatIDR(cart.total)} total
        </span>
      </div>
      <ul className="space-y-1.5">
        {cart.items.map((item) => (
          <li
            key={item.productId}
            className="flex items-center gap-2 rounded-xl bg-stone-50 p-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-stone-900">
                {item.name}
              </p>
              <p className="text-[10px] text-stone-500">
                {item.quantity} × {formatIDR(item.unitPrice)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={`Kurangi ${item.name}`}
                onClick={() => cart.setQuantity(item.productId, item.quantity - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-base font-bold text-stone-700 ring-1 ring-stone-200 active:bg-stone-100"
              >
                &minus;
              </button>
              <span className="min-w-6 text-center text-sm font-bold text-stone-900">
                {formatNumberID(item.quantity)}
              </span>
              <button
                type="button"
                aria-label={`Tambah ${item.name}`}
                onClick={() => cart.setQuantity(item.productId, item.quantity + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white active:opacity-80"
              >
                <Icon name="plus" className="h-4 w-4" />
              </button>
            </div>
            <p className="w-20 shrink-0 text-right text-sm font-bold text-stone-900">
              {formatIDR(item.quantity * item.unitPrice)}
            </p>
            <button
              type="button"
              aria-label={`Hapus ${item.name}`}
              onClick={() => cart.removeItem(item.productId)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 active:bg-red-100"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
