"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers/AppProviders";
import { Icon } from "@/components/ui/icons";
import { ScannerView } from "./ScannerView";
import { ScanResultSheet, type ScanResult } from "./ScanResultSheet";

/**
 * LAYAR SCAN — aksi utama aplikasi.
 * Alur: BUKA APLIKASI → SCAN → (produk dikenali | daftar produk baru).
 * Selesai di identifikasi/pendaftaran produk — transaksi menyusul di Tahap 3.
 */
export function ScanScreen() {
  const { products } = useApp();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  /** Inti logika barcode → produk: cari di data produk yang sudah tersimpan. */
  const handleCode = useCallback(
    async (code: string) => {
      const product = await products.getProductByBarcode(code);
      setResult(product ? { kind: "found", product } : { kind: "not-found", barcode: code });
    },
    [products],
  );

  function handleScanAgain() {
    setResult(null);
    setManualCode("");
    setManualError(null);
    setScanKey((key) => key + 1);
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = manualCode.trim();
    if (!code) {
      setManualError("Masukkan kode barcode terlebih dahulu.");
      return;
    }
    setManualError(null);
    void handleCode(code);
  }

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
        <h1 className="text-base font-bold">Scan Barcode</h1>
      </div>

      <div className="flex flex-1 flex-col items-center px-4">
        <div className="relative mt-2 aspect-[4/3] w-full max-w-sm">
          {result === null ? (
            <ScannerView key={scanKey} onCode={handleCode} />
          ) : (
            <div className="absolute inset-0 overflow-hidden rounded-2xl bg-stone-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon name="barcode" className="h-16 w-16 text-white/20" />
              </div>
            </div>
          )}

          {/* Bingkai area pemindaian — di atas video, tidak menghalangi sentuhan. */}
          <div className="pointer-events-none absolute inset-6">
            <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 border-brand-400" />
            <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-2xl border-r-4 border-t-4 border-brand-400" />
            <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-2xl border-b-4 border-l-4 border-brand-400" />
            <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 border-brand-400" />
            {result === null ? (
              <span className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse rounded bg-brand-400/70" />
            ) : null}
          </div>
        </div>

        <p className="mt-4 text-center text-sm font-semibold">
          Arahkan kamera ke barcode barang
        </p>
        <p className="mt-1 max-w-[34ch] text-center text-xs leading-relaxed text-white/60">
          Barang yang sudah terdaftar langsung dikenali. Barang baru? Form
          tambah produk akan muncul sendiri.
        </p>

        {result === null ? (
          <div className="mt-5 w-full max-w-sm">
            {manualOpen ? (
              <form onSubmit={handleManualSubmit} className="space-y-2">
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
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="mx-auto flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-4 text-xs font-semibold text-white/80 active:bg-white/20"
              >
                <Icon name="search" className="h-4 w-4" />
                Masukkan kode manual
              </button>
            )}
          </div>
        ) : null}

        <div className="mb-8 mt-auto w-full max-w-sm pt-6">
          <div className="rounded-2xl bg-white/[0.07] p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-white/50">
              Alur jualan
            </h2>
            <ol className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1.5 text-[11px]">
              {["Scan barcode", "Produk dikenali", "Jumlah", "Tunai / Bon", "Selesai"].map(
                (step, index) => (
                  <li
                    key={step}
                    className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 font-medium text-white/70"
                  >
                    {step}
                    {index < 4 ? (
                      <Icon name="chevronRight" className="h-3 w-3 text-white/30" />
                    ) : null}
                  </li>
                ),
              )}
            </ol>
            <p className="mt-2 text-[11px] leading-relaxed text-white/40">
              Tahap 2 berakhir di pengenalan produk — pencatatan transaksi aktif
              di Tahap 3.
            </p>
          </div>
        </div>
      </div>

      {result !== null ? (
        <ScanResultSheet result={result} onScanAgain={handleScanAgain} />
      ) : null}
    </div>
  );
}
