"use client";

import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { Icon } from "@/components/ui/icons";
import {
  dailyTotals,
  summarizeTransactions,
  topProducts,
  type ReportRangeKey,
} from "@/lib/reports";
import { formatIDR, formatNumberID } from "@/lib/money";
import { cn } from "@/lib/cn";

const RANGES: Array<{ key: ReportRangeKey; label: string }> = [
  { key: "today", label: "Hari Ini" },
  { key: "week", label: "Minggu Ini" },
  { key: "month", label: "Bulan Ini" },
];

/**
 * Layar Laporan — dihitung LANGSUNG dari database transaksi perangkat
 * (offline-first): omzet, jumlah transaksi, bon, produk terlaris, dan
 * grafik 7 hari. Tanpa internet sama sekali.
 */
export function ReportsScreen() {
  const { transactions, ensureLocal } = useCatalog();
  const [range, setRange] = useState<ReportRangeKey>("today");

  useEffect(() => {
    void ensureLocal();
  }, [ensureLocal]);

  const summary = useMemo(
    () =>
      summarizeTransactions(transactions ?? [], range),
    [transactions, range],
  );
  const best = useMemo(() => topProducts(transactions ?? [], range, 5), [transactions, range]);
  const week = useMemo(() => dailyTotals(transactions ?? [], 7), [transactions]);
  const weekMax = Math.max(1, ...week.map((day) => day.total));

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Pilih periode laporan"
        className="flex gap-2"
      >
        {RANGES.map((item) => {
          const active = range === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setRange(item.key)}
              className={cn(
                "min-h-10 flex-1 rounded-full border px-3 text-xs font-semibold transition-colors",
                active
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-stone-200 bg-white text-stone-600",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
          <p className="text-[11px] text-stone-500">Omzet</p>
          <p className="mt-1 text-base font-bold text-stone-900">
            {formatIDR(summary.omzet)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
          <p className="text-[11px] text-stone-500">Transaksi</p>
          <p className="mt-1 text-base font-bold text-stone-900">
            {formatNumberID(summary.transactionCount)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
          <p className="text-[11px] text-stone-500">Bon</p>
          <p className="mt-1 text-base font-bold text-stone-900">
            {formatIDR(summary.bonTotal)}
          </p>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Omzet 7 Hari</h2>
          <span className="text-[11px] text-stone-400">dari data perangkat</span>
        </div>
        <div className="mt-3 flex h-40 items-end gap-1.5" aria-hidden>
          {week.map((day, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-brand-500/90"
                style={{ height: `${Math.max(3, (day.total / weekMax) * 100)}%` }}
                title={`${day.label}: ${formatIDR(day.total)}`}
              />
              <span className="text-[9px] font-semibold text-stone-400">
                {day.label}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-center text-[10px] text-stone-400">
          Tinggi batang = omzet harian
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
        <h2 className="text-sm font-bold text-stone-900">Produk Terlaris</h2>
        {best.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-stone-200 px-3 py-5 text-center text-xs text-stone-400">
            Belum ada penjualan pada periode ini
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {best.map((item, index) => (
              <li
                key={item.name}
                className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-700 ring-1 ring-stone-200">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">
                  {item.name}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs font-bold text-stone-900">
                    {formatNumberID(item.quantity)} terjual
                  </span>
                  <span className="block text-[10px] text-stone-400">
                    {formatIDR(item.revenue)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {transactions !== null && transactions.length === 0 ? (
        <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] text-stone-400">
          <Icon name="chart" className="h-4 w-4" />
          Laporan terisi otomatis dari transaksi warung Anda
        </p>
      ) : null}
    </div>
  );
}
