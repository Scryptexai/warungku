"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { useApp } from "@/components/providers/AppProviders";
import { useCatalog } from "@/components/providers/CatalogProvider";
import type { Customer, Transaction } from "@/domain";
import { formatIDR, formatNumberID } from "@/lib/money";
import { cn } from "@/lib/cn";

/**
 * HALAMAN PEMBAYARAN BON — kelola piutang pelanggan.
 *
 * - Daftar seluruh pelanggan dengan outstanding > 0, diurutkan piutang terbesar.
 * - Ketuk pelanggan → lihat daftar transaksi BON mereka yang masih piutang,
 *   total piutang, dan tombol "Bayar" (nominal parsial atau lunas).
 * - Pelunasan via CustomerService.settleOutstanding (kurangi outstandingBalance,
 *   enqueue UPDATE customer ke antrean Sheets — sinkron saat token hidup).
 *
 * Pola: offline-first. Pembayaran bon TIDAK membuat transaksi barang baru —
 * fokusnya pergerakan piutang saja.
 */
export function BonScreen() {
  const { customers, ensureLocal, reloadLocal } = useCatalog();
  const { customers: customerService } = useApp();
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleBusy, setSettleBusy] = useState(false);
  const [settleReport, setSettleReport] = useState<string | null>(null);

  useEffect(() => {
    void ensureLocal();
  }, [ensureLocal]);

  // Daftar piutang: hanya pelanggan dengan outstanding > 0, sort desc.
  const debtors = useMemo(() => {
    const list = customers ?? [];
    const filtered = list.filter((c) => c.outstandingBalance > 0);
    const q = query.trim().toLowerCase();
    const searched = q
      ? filtered.filter((c) => c.name.toLowerCase().includes(q))
      : filtered;
    return [...searched].sort((a, b) => b.outstandingBalance - a.outstandingBalance);
  }, [customers, query]);

  const totalOutstanding = useMemo(
    () => debtors.reduce((sum, c) => sum + c.outstandingBalance, 0),
    [debtors],
  );

  // Reset nominal bayar ke nilai piutang penuh saat ganti pelanggan.
  useEffect(() => {
    if (opened) {
      setSettleAmount(String(opened.outstandingBalance));
      setSettleReport(null);
    }
  }, [opened]);

  async function handleSettle() {
    if (!opened || settleBusy) return;
    const amount = Number(settleAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setSettleReport("Masukkan nominal yang valid.");
      return;
    }
    setSettleBusy(true);
    setSettleReport(null);
    try {
      const updated = await customerService.settleOutstanding(opened.id, amount);
      await reloadLocal();
      const settled = opened.outstandingBalance - updated.outstandingBalance;
      setOpened(updated);
      setSettleReport(
        updated.outstandingBalance === 0
          ? `✓ Lunas. ${formatIDR(settled)} diterima.`
          : `✓ ${formatIDR(settled)} diterima. Sisa ${formatIDR(updated.outstandingBalance)}.`,
      );
      if (updated.outstandingBalance > 0) {
        setSettleAmount(String(updated.outstandingBalance));
      }
    } catch (error) {
      setSettleReport(
        error instanceof Error ? error.message : "Gagal mencatat pelunasan.",
      );
    } finally {
      setSettleBusy(false);
    }
  }

  if (opened) {
    return (
      <BonDetail
        customer={opened}
        onBack={() => {
          setOpened(null);
          setSettleReport(null);
        }}
        settleAmount={settleAmount}
        setSettleAmount={setSettleAmount}
        settleBusy={settleBusy}
        settleReport={settleReport}
        onSettle={handleSettle}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
          Total Piutang Aktif
        </p>
        <p className="mt-1 text-2xl font-bold text-amber-900">
          {formatIDR(totalOutstanding)}
        </p>
        <p className="mt-0.5 text-xs text-amber-700">
          {debtors.length} pelanggan dengan bon belum lunas
        </p>
      </div>

      <div className="relative">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama pelanggan…"
          aria-label="Cari pelanggan"
          className="min-h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400"
        />
      </div>

      {debtors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center">
          <p className="text-sm font-bold text-stone-900">Tidak ada bon aktif</p>
          <p className="mt-1 text-xs text-stone-500">
            Catat transaksi baru dengan mode BON untuk membuat piutang.
          </p>
          <Link
            href="/scan?pay=bon"
            className="mt-3 inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white active:opacity-80"
          >
            <Icon name="plus" className="h-4 w-4" />
            Catat Bon Baru
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {debtors.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => setOpened(customer)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-stone-900/5 active:bg-stone-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-stone-900">
                    {customer.name}
                  </span>
                  {customer.phone ? (
                    <span className="block text-[11px] text-stone-400">
                      {customer.phone}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold text-amber-700">
                    {formatIDR(customer.outstandingBalance)}
                  </span>
                  <span className="text-[10px] font-semibold text-stone-400">
                    Bayar →
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BonDetail({
  customer,
  onBack,
  settleAmount,
  setSettleAmount,
  settleBusy,
  settleReport,
  onSettle,
}: {
  customer: Customer;
  onBack: () => void;
  settleAmount: string;
  setSettleAmount: (value: string) => void;
  settleBusy: boolean;
  settleReport: string | null;
  onSettle: () => void;
}) {
  const { transactions, ensureLocal } = useCatalog();
  const [history, setHistory] = useState<Transaction[]>([]);

  useEffect(() => {
    void ensureLocal();
  }, [ensureLocal]);

  useEffect(() => {
    // Riwayat BON milik pelanggan ini. Pakai nama persis (case-insensitive
    // untuk toleransi beda kapitalisasi entry kasir).
    const all = transactions ?? [];
    const target = customer.name.trim().toLowerCase();
    const list = all
      .filter(
        (t) =>
          t.paymentType === "BON" &&
          (t.customer?.name ?? "").trim().toLowerCase() === target,
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    setHistory(list);
  }, [transactions, customer.name]);

  const totalBon = history.reduce((sum, t) => sum + t.total, 0);
  const paid = Math.max(0, totalBon - customer.outstandingBalance);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600"
      >
        <Icon name="chevronRight" className="h-4 w-4 rotate-180" />
        Kembali ke daftar
      </button>

      <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
          Pelanggan
        </p>
        <p className="mt-1 text-lg font-bold text-amber-900">{customer.name}</p>
        {customer.phone ? (
          <p className="text-xs text-amber-700">{customer.phone}</p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-white/70 p-2">
            <p className="text-[10px] font-semibold uppercase text-amber-700">Total Bon</p>
            <p className="text-sm font-bold text-amber-900">
              {formatIDR(totalBon)}
            </p>
          </div>
          <div className="rounded-lg bg-white/70 p-2">
            <p className="text-[10px] font-semibold uppercase text-amber-700">
              Sisa Piutang
            </p>
            <p className="text-sm font-bold text-amber-900">
              {formatIDR(customer.outstandingBalance)}
            </p>
          </div>
        </div>
        {paid > 0 ? (
          <p className="mt-2 text-[11px] text-amber-700">
            Sudah dibayar {formatIDR(paid)}.
          </p>
        ) : null}
      </div>

      {customer.outstandingBalance > 0 ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
          <p className="text-sm font-bold text-stone-900">Catat Pembayaran</p>
          <p className="mt-0.5 text-xs text-stone-500">
            Nominal parsial atau lunas. Maks {formatIDR(customer.outstandingBalance)}.
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-stone-500">Rp</span>
              <input
                value={settleAmount}
                onChange={(event) => setSettleAmount(event.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="0"
                aria-label="Nominal pembayaran bon"
                className="min-h-12 w-full rounded-xl border border-stone-200 px-3 text-base font-bold text-stone-900 outline-none focus:border-brand-400"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Lunas", value: customer.outstandingBalance },
                { label: "50%", value: Math.round(customer.outstandingBalance / 2) },
                { label: "25%", value: Math.round(customer.outstandingBalance / 4) },
              ].map((quick) => (
                <button
                  key={quick.label}
                  type="button"
                  onClick={() => setSettleAmount(String(quick.value))}
                  className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-bold text-stone-700 active:bg-stone-200"
                >
                  {quick.label} · {formatNumberID(quick.value)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onSettle}
              disabled={settleBusy || !settleAmount}
              className={cn(
                "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white active:opacity-80 disabled:opacity-50",
                "bg-emerald-600",
              )}
            >
              <Icon name="check" className="h-4 w-4" />
              {settleBusy ? "Menyimpan…" : "BAYAR"}
            </button>
            {settleReport ? (
              <p
                role="status"
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-semibold",
                  settleReport.startsWith("✓")
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-red-50 text-red-700",
                )}
              >
                {settleReport}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="rounded-2xl bg-emerald-50 p-4 text-center text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
          ✓ Lunas — tidak ada piutang tersisa
        </p>
      )}

      <div>
        <h2 className="mb-2 text-sm font-bold text-stone-700">
          Riwayat Bon ({history.length})
        </h2>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-200 bg-white p-4 text-center text-xs text-stone-400">
            Belum ada transaksi BON atas nama pelanggan ini.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((trx) => (
              <li
                key={trx.id}
                className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-stone-500">
                    {new Date(trx.timestamp).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-sm font-bold text-amber-700">
                    {formatIDR(trx.total)}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {trx.items.map((item) => (
                    <p
                      key={item.productId}
                      className="text-[11px] text-stone-500"
                    >
                      {item.productName} × {formatNumberID(item.quantity)} @{" "}
                      {formatIDR(item.unitPrice)}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
