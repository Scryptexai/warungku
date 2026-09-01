"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useCart } from "@/components/providers/CartProvider";
import { Icon } from "@/components/ui/icons";
import type { Customer, PaymentType } from "@/domain";
import { formatIDR } from "@/lib/money";
import { cn } from "@/lib/cn";

type Step = "choose" | "cash-confirm" | "bon-customer" | "confirm";

/**
 * Panel pembayaran — alur Tahap 5:
 *   TOTAL → TUNAI / BON → (BON: cari/pilih pelanggan) → KONFIRMASI → SIMPAN.
 *
 * - TUNAI dan BON dibedakan sangat jelas (warna & ikon berbeda).
 * - Pelanggan BON: ketik untuk MENCARI pelanggan lama (nama + total bon)
 *   atau langsung pakai nama baru.
 * - SIMPAN TRANSAKSI hanya aktif di layar konfirmasi (§12) — transaksi
 *   tidak pernah tersimpan otomatis setelah scan.
 */
export function PaymentSheet({
  onClose,
  onSubmit,
  saving,
  initialPaymentType,
}: {
  onClose: () => void;
  /** Dipanggil dengan (paymentType, customerName?) — sekali saja per transaksi. */
  onSubmit: (paymentType: PaymentType, customerName?: string) => void;
  saving: boolean;
  /**
   * §5A: tombol TUNAI/BON di layar transaksi bisa langsung membuka langkah
   * yang sesuai — konfirmasi SIMPAN eksplisit tetap wajib (§12).
   */
  initialPaymentType?: PaymentType;
}) {
  const { customers, ensureLocal } = useCatalog();
  const cart = useCart();

  const [step, setStep] = useState<Step>(
    initialPaymentType === "CASH"
      ? "cash-confirm"
      : initialPaymentType === "BON"
        ? "bon-customer"
        : "choose",
  );
  const [paymentType, setPaymentType] = useState<PaymentType>(
    initialPaymentType ?? "CASH",
  );
  const [customerName, setCustomerName] = useState("");
  const [pickedCustomer, setPickedCustomer] = useState<Customer | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Saran pelanggan BON dari cache sesi — instan saat mengetik (§8).
  useEffect(() => {
    void ensureLocal();
  }, [ensureLocal]);

  const suggestions = useMemo(() => {
    const q = customerName.trim().toLowerCase();
    const list = customers ?? [];
    if (!q) return list.slice(0, 4);
    return list
      .filter((customer) => customer.name.toLowerCase().includes(q))
      .slice(0, 4);
  }, [customers, customerName]);

  const effectiveName = pickedCustomer ? pickedCustomer.name : customerName.trim();

  function choosePayment(type: PaymentType) {
    setPaymentType(type);
    setStep(type === "CASH" ? "cash-confirm" : "bon-customer");
  }

  function handleBonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!effectiveName) {
      setNameError("Pilih pelanggan untuk transaksi BON.");
      return;
    }
    setNameError(null);
    setStep("confirm");
  }

  function handleSave() {
    if (saving) return; // anti submit ganda (§15)
    if (paymentType === "BON" && !effectiveName) {
      setStep("bon-customer");
      return;
    }
    onSubmit(paymentType, paymentType === "BON" ? effectiveName : undefined);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60">
      <div className="animate-sheet-up max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-7">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">
            {step === "confirm" ? "Konfirmasi Transaksi" : "Pembayaran"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pembayaran"
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 active:bg-stone-200 disabled:opacity-40"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 rounded-2xl bg-stone-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            Total {cart.count} barang · {cart.items.length} produk
          </p>
          <p className="mt-1 text-3xl font-bold text-stone-900">{formatIDR(cart.total)}</p>
        </div>

        {/* Ringkasan konfirmasi (§12) */}
        {step === "confirm" ? (
          <dl className="mt-3 space-y-2 rounded-2xl border border-stone-200 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Pembayaran</dt>
              <dd className="font-bold text-stone-900">
                {paymentType === "BON" ? "BON (catat bon)" : "TUNAI"}
              </dd>
            </div>
            {paymentType === "BON" ? (
              <div className="flex justify-between gap-3">
                <dt className="text-stone-500">Pelanggan</dt>
                <dd className="max-w-[60%] truncate font-bold text-stone-900">
                  {effectiveName}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Jumlah Produk</dt>
              <dd className="font-bold text-stone-900">{cart.items.length}</dd>
            </div>
            <div className="mt-2 space-y-1.5 border-t border-dashed border-stone-200 pt-2">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex justify-between gap-3 text-xs">
                  <span className="min-w-0 flex-1 truncate text-stone-600">
                    {item.name} <span className="text-stone-400">× {item.quantity}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-stone-800">
                    {formatIDR(item.quantity * item.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
          </dl>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {cart.items.map((item) => (
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
        )}

        {step === "choose" ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => choosePayment("CASH")}
              className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl bg-brand-600 text-white active:opacity-90"
            >
              <Icon name="cart" className="h-7 w-7" />
              <span className="text-sm font-bold">TUNAI</span>
              <span className="text-[11px] text-white/75">Bayar langsung</span>
            </button>
            <button
              type="button"
              onClick={() => choosePayment("BON")}
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
              onClick={() => setStep("confirm")}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80 disabled:opacity-50"
            >
              Lanjut — Konfirmasi
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

        {step === "bon-customer" ? (
          <form onSubmit={handleBonSubmit} className="mt-4 space-y-2" noValidate>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-stone-600">
                Nama Pelanggan <span className="font-normal text-amber-600">(wajib)</span>
              </span>
              <input
                value={customerName}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  setPickedCustomer(null);
                  setNameError(null);
                }}
                placeholder="Cari nama atau ketik nama baru…"
                maxLength={40}
                autoComplete="off"
                disabled={saving}
                aria-label="Nama pelanggan bon"
                className="min-h-12 w-full rounded-xl border border-stone-200 px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400"
              />
              {nameError ? (
                <span className="mt-1 block text-xs text-red-600">{nameError}</span>
              ) : null}
            </label>

            {suggestions.length > 0 && !pickedCustomer ? (
              <div className="space-y-1.5" role="listbox" aria-label="Pelanggan yang cocok">
                {suggestions.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      setPickedCustomer(customer);
                      setCustomerName(customer.name);
                      setNameError(null);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left active:bg-stone-50"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">
                      {customer.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-bold",
                        customer.outstandingBalance > 0 ? "text-amber-600" : "text-stone-400",
                      )}
                    >
                      {customer.outstandingBalance > 0
                        ? `Bon ${formatIDR(customer.outstandingBalance)}`
                        : "Tidak ada bon"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {pickedCustomer ? (
              <p className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800">
                Memakai pelanggan lama: <b>{pickedCustomer.name}</b>
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-500 text-sm font-semibold text-white active:opacity-80 disabled:opacity-50"
            >
              Lanjut — Konfirmasi
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

        {step === "confirm" ? (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white active:opacity-80 disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : "SIMPAN TRANSAKSI"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setStep(paymentType === "BON" ? "bon-customer" : "cash-confirm")}
              className="min-h-10 w-full text-center text-xs font-semibold text-stone-500"
            >
              Ubah pembayaran
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
