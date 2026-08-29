"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { formatIDR } from "@/lib/money";
import { cn } from "@/lib/cn";

const RANGES = ["Hari Ini", "Minggu Ini", "Bulan Ini"] as const;
type Range = (typeof RANGES)[number];

/**
 * Kerangka layar Laporan: pilihan periode + ringkasan + tempat grafik.
 * Laporan sungguhan dihitung di Tahap 4.
 */
export function ReportsScreen() {
  const [range, setRange] = useState<Range>("Hari Ini");

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Pilih periode laporan"
        className="flex gap-2"
      >
        {RANGES.map((item) => {
          const active = range === item;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setRange(item)}
              className={cn(
                "min-h-10 flex-1 rounded-full border px-3 text-xs font-semibold transition-colors",
                active
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-stone-200 bg-white text-stone-600",
              )}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
          <p className="text-[11px] text-stone-500">Omzet</p>
          <p className="mt-1 text-base font-bold text-stone-900">{formatIDR(0)}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
          <p className="text-[11px] text-stone-500">Transaksi</p>
          <p className="mt-1 text-base font-bold text-stone-900">0</p>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
          <p className="text-[11px] text-stone-500">Bon</p>
          <p className="mt-1 text-base font-bold text-stone-900">{formatIDR(0)}</p>
        </div>
      </div>

      <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white text-center">
        <Icon name="chart" className="h-8 w-8 text-stone-300" />
        <p className="text-sm font-semibold text-stone-600">Grafik Penjualan</p>
        <p className="text-xs text-stone-400">Grafik hadir di Tahap 4</p>
      </div>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
        <h2 className="text-sm font-bold text-stone-900">Produk Terlaris</h2>
        <p className="mt-2 rounded-xl border border-dashed border-stone-200 px-3 py-5 text-center text-xs text-stone-400">
          Belum ada data penjualan
        </p>
      </section>
    </div>
  );
}
