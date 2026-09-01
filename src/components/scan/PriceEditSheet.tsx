"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { digitsOnly, parseWholeNumber } from "@/lib/input";
import { formatIDR } from "@/lib/money";

/**
 * Ubah harga SATU baris untuk transaksi ini saja (§5A — pemisahan input
 * produk dari finalisasi harga). Harga master produk TIDAK berubah;
 * transaksi menyimpan snapshot harga yang di Kasir pakai.
 */
export function PriceEditSheet({
  productName,
  currentPrice,
  masterPrice,
  onSave,
  onClose,
}: {
  productName: string;
  currentPrice: number;
  /** Harga master — ditampilkan sebagai pembanding. */
  masterPrice: number;
  onSave: (price: number) => void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState(String(currentPrice));

  useEffect(() => {
    setRaw(String(currentPrice));
  }, [currentPrice]);

  const parsed = parseWholeNumber(raw) ?? 0;
  const changed = parsed !== currentPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="animate-sheet-up w-full max-w-lg rounded-t-3xl bg-white p-5 pb-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-stone-900">Ubah Harga</h2>
            <p className="mt-0.5 truncate text-xs text-stone-500">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-stone-600">
            Harga untuk transaksi ini
          </span>
          <input
            value={raw}
            onChange={(event) => setRaw(digitsOnly(event.target.value))}
            inputMode="numeric"
            autoFocus
            aria-label="Harga baru untuk transaksi ini"
            className="mt-1 min-h-14 w-full rounded-xl border border-stone-200 bg-white px-3 text-lg font-bold text-stone-900 outline-none focus:border-brand-400"
          />
          <span className="mt-1 block text-xs text-stone-400">
            {parsed > 0 ? formatIDR(parsed) : "—"}
          </span>
        </label>

        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          Hanya berlaku untuk transaksi ini — harga produk di daftar tetap{" "}
          <span className="font-bold">{formatIDR(masterPrice)}</span>.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={!changed}
            onClick={() => onSave(parsed)}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80 disabled:opacity-40"
          >
            <Icon name="check" className="h-5 w-5" />
            Pakai Harga Ini
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-700 active:opacity-80"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
