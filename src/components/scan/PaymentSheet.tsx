"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icons";
import { useCart } from "@/components/providers/CartProvider";
import type { PaymentType } from "@/domain";
import { formatIDR } from "@/lib/money";

export type PaymentStep = "choose" | "cash-confirm" | "bon-form";

/**
 * Panel pembayaran: TOTAL besar + dua pilihan utama (TUNAI / BON).
 * BON → input nama pembeli (wajib) → [SIMPAN BON].
 * TUNAI → konfirmasi → [SIMPAN TRANSAKSI].
 */
export function PaymentSheet({
  onClose,
  onSubmit,
  saving,
}: {
  onClose: () => void;
  /** Dipanggil dengan (paymentType, customerName?) — sekali saja per transaksi. */
  onSubmit: (paymentType: PaymentType, customerName?: string) => void;
  saving: boolean;
}) {
  const { items, count, total } = useCart();
  const [step, setStep] = useState<PaymentStep>("choose");
  const [customerName, setCustomerName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  function handleBonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = customerName.trim();
    if (!name) {
      setNameError("Nama pembeli wajib diisi untuk transaksi bon.");
      return;
    }
    setNameError(null);
    onSubmit("BON", name);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60">
      <div className="animate-sheet-up max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-7">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Pembayaran</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pembayaran"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 active:bg-stone-200"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 rounded-2xl bg-stone-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            Total {count} barang
          </p>
          <p className="mt-1 text-3xl font-bold text-stone-900">{formatIDR(total)}</p>
        </div>

        {items.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {items.map((item) => (
              <li
                key={item.productId}
                className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-stone-100"
              >
                <span className="min-w-0 flex-1 truncate font-semibold text-stone-700">
                  {item.name}
                </span>
                <span className="shrink-0 text-stone-500">
                  {item.quantity} × {formatIDR(item.unitPrice)}
                </span>
                <span className="w-20 shrink-0 text-right font-bold text-stone-900">
                  {formatIDR(item.quantity * item.unitPrice)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {step === "choose" ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStep("cash-confirm")}
              className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl bg-brand-600 text-white active:opacity-90"
            >
              <Icon name="cart" className="h-7 w-7" />
              <span className="text-sm font-bold">TUNAI</span>
              <span className="text-[11px] text-white/75">Bayar langsung</span>
            </button>
            <button
              type="button"
              onClick={() => setStep("bon-form")}
              className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl bg-amber-500 text-white active:opacity-90"
            >
              <Icon name="receipt" className="h-7 w-7" />
              <span className="text-sm font-bold">BON</span>
              <span className="text-[11px] text-white/85">Catat nama pembeli</span>
            </button>
          </div>
        ) : null}

        {step === "cash-confirm" ? (
          <div className="mt-4 space-y-2">
            <p className="text-center text-xs text-stone-500">
              Pastikan uang pembeli sudah diterima, lalu simpan transaksi.
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={() => onSubmit("CASH")}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80 disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : `SIMPAN — ${formatIDR(total)}`}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setStep("choose")}
              className="min-h-10 w-full text-center text-xs font-semibold text-stone-500"
            >
              Batal
            </button>
          </div>
        ) : null}

        {step === "bon-form" ? (
          <form onSubmit={handleBonSubmit} className="mt-4 space-y-2" noValidate>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-stone-600">
                Nama Pembeli <span className="font-normal text-amber-600">(wajib)</span>
              </span>
              <input
                value={customerName}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  setNameError(null);
                }}
                placeholder="cth. Pak Budi"
                maxLength={40}
                autoComplete="off"
                disabled={saving}
                aria-label="Nama pembeli bon"
                className="min-h-12 w-full rounded-xl border border-stone-200 px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400"
              />
              {nameError ? (
                <span className="mt-1 block text-xs text-red-600">{nameError}</span>
              ) : null}
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-500 text-sm font-semibold text-white active:opacity-80 disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : `SIMPAN BON — ${formatIDR(total)}`}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setStep("choose")}
              className="min-h-10 w-full text-center text-xs font-semibold text-stone-500"
            >
              Batal
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
