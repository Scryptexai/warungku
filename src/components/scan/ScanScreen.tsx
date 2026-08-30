"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/AppProviders";
import { useCart } from "@/components/providers/CartProvider";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { Icon } from "@/components/ui/icons";
import type { PaymentType, SyncState } from "@/domain";
import { formatIDR } from "@/lib/money";
import { ScannerView } from "./ScannerView";
import { ScanResultSheet, type ScanResult } from "./ScanResultSheet";
import { CartBar } from "./CartBar";
import { PaymentSheet } from "./PaymentSheet";
import { SaleResultSheet } from "./SaleResultSheet";
import { ProductSearchSheet } from "./ProductSearchSheet";

type View = "scan" | "cart" | "pay" | "result";

/**
 * LAYAR SCAN — pusat alur jualan Tahap 3:
 * SCAN → PRODUK DIKENALI → JUMLAH → KERANJANG → TUNAI/BON → SIMPAN → SELESAI.
 * Produk baru ditambahkan dari sini pun tetap kembali ke transaksi ini.
 */
export function ScanScreen() {
  const { products, sales, sync } = useApp();
  const cart = useCart();
  const catalog = useCatalog();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const [view, setView] = useState<View>("scan");
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
  const [searchOpen, setSearchOpen] = useState(false);

  /** Barcode → produk: cari di database produk warung. */
  const handleCode = useCallback(
    async (code: string) => {
      const product = await products.getProductByBarcode(code);
      if (product) {
        setScanResult({ kind: "found", product });
        return;
      }
      // Produk belum terdaftar → langsung buka form Tambah Produk (alur scan)
      // dengan barcode terisi otomatis. Tanpa langkah konfirmasi tambahan.
      router.push(`/produk/tambah?barcode=${encodeURIComponent(code)}&alur=scan`);
    },
    [products, router],
  );

  // Produk baru dari alur scan (?added=<id>) → langsung masuk keranjang.
  const addedId = searchParams.get("added");
  useEffect(() => {
    if (!addedId) return;
    let active = true;
    void products.getProductById(addedId).then((product) => {
      if (!active || !product) return;
      cart.addProduct(product);
      router.replace("/scan");
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addedId]);

  function handleScanAgain() {
    setScanResult(null);
    setManualCode("");
    setManualError(null);
    setScanKey((key) => key + 1);
  }

  function handleAddToCart(productId: string, quantity: number) {
    const product = scanResult?.kind === "found" ? scanResult.product : null;
    if (product && product.id === productId) {
      cart.addProduct(product, quantity);
    }
    handleScanAgain();
  }

  async function handlePay(paymentType: PaymentType, customerName?: string) {
    if (saving) return; // cegah submit ganda
    setSaving(true);
    setSaleError(null);
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
      setSaleError(
        error instanceof Error ? error.message : "Gagal menyimpan transaksi. Coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRetrySync() {
    if (!saleResult) return;
    setRetrying(true);
    try {
      await sync.syncNow();
      // Sinkronkan status sinkron (state + antrian) dari engine, bukan ringkasan run.
      // Kompatibel dengan SaleResultSheet yang mengharapkan { state, queuedCount }.
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
    setView("scan");
    handleScanAgain();
    // Segarkan cache sesi (stok berubah setelah transaksi) — murah & instan.
    void catalog.reloadLocal();
  }

  const showCamera = view === "scan" && scanResult === null;

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-stone-950 text-white">
      <div className="flex items-center gap-3 px-4 pb-2 pt-5">
        <Link
          href="/"
          aria-label="Tutup layar scan"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
        >
          <Icon name="close" className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold">Scan Barang</h1>
        {cart.count > 0 ? (
          <span className="ml-auto rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-bold">
            {cart.count} barang
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col items-center px-4">
        <div className="relative mt-2 aspect-[4/3] w-full max-w-sm">
          {showCamera ? (
            <ScannerView key={scanKey} onCode={handleCode} />
          ) : (
            <div className="absolute inset-0 overflow-hidden rounded-2xl bg-stone-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon name="barcode" className="h-16 w-16 text-white/20" />
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-6">
            <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 border-brand-400" />
            <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-2xl border-r-4 border-t-4 border-brand-400" />
            <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-2xl border-b-4 border-l-4 border-brand-400" />
            <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 border-brand-400" />
            {showCamera ? (
              <span className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse rounded bg-brand-400/70" />
            ) : null}
          </div>
        </div>

        {view === "scan" && scanResult === null ? (
          <>
            <p className="mt-4 text-center text-sm font-semibold">
              Arahkan kamera ke barcode barang
            </p>
            <p className="mt-1 max-w-[34ch] text-center text-xs leading-relaxed text-white/60">
              Barang terdaftar langsung dikenali. Barang baru? Form tambah
              produk muncul sendiri.
            </p>
            <div className="mt-5 w-full max-w-sm">
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
                  className="space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      value={manualCode}
                      onChange={(event) => setManualCode(event.target.value)}
                      placeholder="Ketik kode barcode"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label="Kode barcode manual"
                      className="min-h-12 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/40"
                    />
                    <button
                      type="submit"
                      className="min-h-12 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white active:opacity-80"
                    >
                      Cari
                    </button>
                  </div>
                  {manualError ? (
                    <p className="text-xs text-amber-300" role="alert">
                      {manualError}
                    </p>
                  ) : null}
                </form>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManualOpen(true)}
                    className="flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-4 text-xs font-semibold text-white/80 active:bg-white/20"
                  >
                    <Icon name="barcode" className="h-4 w-4" />
                    Kode manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-4 text-xs font-semibold text-white/80 active:bg-white/20"
                  >
                    <Icon name="search" className="h-4 w-4" />
                    Cari produk
                  </button>
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* Daftar keranjang (mode cart) */}
        {view === "cart" ? (
          <div className="mt-3 w-full max-w-sm space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Belanja</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="flex min-h-9 items-center gap-1 rounded-full bg-white/10 px-3 text-xs font-semibold text-white/80"
                >
                  <Icon name="search" className="h-4 w-4" />
                  Cari produk
                </button>
                <button
                  type="button"
                  onClick={() => setView("scan")}
                  className="flex min-h-9 items-center gap-1 rounded-full bg-white/10 px-3 text-xs font-semibold text-white/80"
                >
                  <Icon name="barcode" className="h-4 w-4" />
                  Scan lagi
                </button>
              </div>
            </div>
            {cart.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  <p className="text-[11px] text-white/60">
                    {item.quantity} × {formatIDR(item.unitPrice)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Kurangi ${item.name}`}
                    onClick={() => cart.setQuantity(item.productId, item.quantity - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg font-bold active:bg-white/20"
                  >
                    &minus;
                  </button>
                  <span className="min-w-7 text-center text-base font-bold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Tambah ${item.name}`}
                    onClick={() => cart.setQuantity(item.productId, item.quantity + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 active:opacity-80"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Hapus ${item.name}`}
                    onClick={() => cart.removeItem(item.productId)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20 text-red-300 active:bg-red-500/30"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mb-8 mt-auto w-full max-w-sm pt-6">
          {saleError ? (
            <p
              role="alert"
              className="mb-3 rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-2 text-xs text-red-200"
            >
              {saleError}
            </p>
          ) : null}

          {cart.count > 0 && (view === "scan" || view === "cart") ? (
            <div className="space-y-2">
              <CartBar
                itemCount={cart.count}
                total={cart.total}
                onPay={() => setView("pay")}
              />
              {view === "scan" ? (
                <button
                  type="button"
                  onClick={() => setView("cart")}
                  className="min-h-9 w-full text-center text-xs font-semibold text-white/70"
                >
                  Lihat / ubah belanja
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {scanResult !== null && view === "scan" ? (
        <ScanResultSheet
          result={scanResult}
          onAddToCart={(product, quantity) => handleAddToCart(product.id, quantity)}
          onScanAgain={handleScanAgain}
        />
      ) : null}

      {searchOpen ? <ProductSearchSheet onClose={() => setSearchOpen(false)} /> : null}

      {view === "pay" ? (
        <PaymentSheet
          saving={saving}
          onClose={() => setView("scan")}
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
