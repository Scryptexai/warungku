"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers/AppProviders";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { Icon } from "@/components/ui/icons";
import {
  buildReportDocument,
  REPORT_RANGES,
  type ReportRangeKey,
} from "@/lib/reports";
import {
  downloadCsv,
  downloadPdf,
  reportFilename,
  reportToCsv,
  reportToPdf,
} from "@/lib/report-export";
import { formatIDR, formatNumberID } from "@/lib/money";
import { cn } from "@/lib/cn";

/**
 * DASHBOARD LAPORAN (§7) — semua angka dihitung LANGSUNG dari database
 * transaksi/produk/pelanggan perangkat (offline-first), memakai harga
 * SNAPSHOT transaksi. OMZET ≠ LABA (harga beli tidak dihitung di sini).
 * Prioritas tampilan: Omzet → Transaksi → Tunai/Bon → Terlaris → Stok →
 * Bon → ekspor. Pola UI mobile e-wallet dipertahankan.
 */
export function ReportsScreen() {
  const { transactions, products, customers, ensureLocal } = useCatalog();
  const { products: productService } = useApp();
  const [range, setRange] = useState<ReportRangeKey>("today");
  const [thresholds, setThresholds] = useState<Record<string, number>>({});

  useEffect(() => {
    void ensureLocal();
  }, [ensureLocal]);

  useEffect(() => {
    void productService.getLowStockThresholds().then(setThresholds);
  }, [productService]);

  const report = useMemo(
    () =>
      transactions === null || products === null || customers === null
        ? null
        : buildReportDocument({
            transactions,
            products,
            customers,
            range,
            stockThresholds: thresholds,
          }),
    [transactions, products, customers, range, thresholds],
  );

  const breakdownMax = Math.max(
    1,
    ...(report?.breakdown.map((day) => day.total) ?? [0]),
  );

  return (
    <div className="space-y-4">
      {/* Pemilih periode */}
      <div
        role="tablist"
        aria-label="Pilih periode laporan"
        className="flex gap-2"
      >
        {REPORT_RANGES.map((item) => {
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

      {report === null ? (
        <p className="rounded-2xl bg-white p-6 text-center text-xs text-stone-400 ring-1 ring-stone-900/5">
          Memuat data perangkat…
        </p>
      ) : (
        <>
          {/* 1+2: OMZET & TRANSAKSI */}
          <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-4 text-white shadow-sm">
            <p className="text-[11px] font-medium text-white/80">
              Omzet {report.rangeLabel.toLowerCase()}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatIDR(report.summary.omzet)}
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs">
              <span className="rounded-full bg-white/15 px-2.5 py-1 font-semibold">
                {formatNumberID(report.summary.transactionCount)} transaksi
              </span>
              {report.summary.settlementTotal > 0 ? (
                <span className="text-white/80">
                  + pelunasan bon {formatIDR(report.summary.settlementTotal)}
                </span>
              ) : null}
            </div>
          </section>

          {/* 3: TUNAI / BON */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
              <p className="text-[11px] text-stone-500">Tunai</p>
              <p className="mt-1 text-base font-bold text-stone-900">
                {formatIDR(report.summary.cashTotal)}
              </p>
              <p className="text-[10px] text-stone-400">
                {report.summary.cashCount} transaksi tunai
              </p>
            </div>
            <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
              <p className="text-[11px] text-stone-500">Bon</p>
              <p className="mt-1 text-base font-bold text-stone-900">
                {formatIDR(report.summary.bonTotal)}
              </p>
              <p className="text-[10px] text-stone-400">
                {report.summary.bonCount} transaksi bon
              </p>
            </div>
          </div>

          {/* Rincian harian */}
          <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900">
                {range === "month" ? "Omzet Per Tanggal" : "Omzet 7 Hari"}
              </h2>
              <span className="text-[11px] text-stone-400">WIB · dari data perangkat</span>
            </div>
            {range === "month" ? (
              <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {report.breakdown.map((day) => (
                  <li key={day.key} className="flex items-center gap-2 text-xs">
                    <span className="w-7 shrink-0 font-semibold text-stone-400">
                      {day.label}
                    </span>
                    <span className="h-2 rounded-full bg-brand-500/90" style={{ flex: Math.max(0.05, day.total / breakdownMax) }} />
                    <span
                      className={cn(
                        "shrink-0 font-bold",
                        day.total > 0 ? "text-stone-800" : "text-stone-300",
                      )}
                    >
                      {formatIDR(day.total)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 flex h-40 items-end gap-1.5" aria-hidden>
                {report.breakdown.map((day) => (
                  <div key={day.key} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md bg-brand-500/90"
                      style={{ height: `${Math.max(3, (day.total / breakdownMax) * 100)}%` }}
                      title={`${day.key}: ${formatIDR(day.total)}`}
                    />
                    <span className="text-[9px] font-semibold text-stone-400">
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4: PRODUK TERLARIS */}
          <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
            <h2 className="text-sm font-bold text-stone-900">Produk Terlaris</h2>
            {report.topProducts.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-stone-200 px-3 py-5 text-center text-xs text-stone-400">
                Belum ada penjualan pada periode ini
              </p>
            ) : (
              <ol className="mt-3 space-y-2">
                {report.topProducts.slice(0, 5).map((item, index) => (
                  <li
                    key={item.productId ?? item.name}
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

          {/* Jarang terjual — aturan deterministik, bukan AI */}
          <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900">Jarang Terjual</h2>
              <span className="text-[10px] text-stone-400">terjual ≤ 2 di periode ini</span>
            </div>
            {report.slowProducts.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-stone-200 px-3 py-4 text-center text-xs text-stone-400">
                Semua produk aktif terjual &gt; 2 di periode ini
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {report.slowProducts.slice(0, 6).map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold text-stone-700">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-stone-500">
                      {formatNumberID(item.quantity)} terjual · stok{" "}
                      {formatNumberID(item.stock)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 5: STOK + penanda menipis */}
          <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900">Stok</h2>
              <Link
                href="/produk"
                className="text-[11px] font-semibold text-brand-700"
              >
                Kelola produk →
              </Link>
            </div>
            {report.stock.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-stone-200 px-3 py-4 text-center text-xs text-stone-400">
                Belum ada produk di katalog
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {report.stock.slice(0, 8).map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-700">
                      {item.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {item.lowStock ? (
                        <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
                          Menipis
                        </span>
                      ) : null}
                      <span className="text-xs font-bold text-stone-800">
                        {formatNumberID(item.stock)} {item.unit}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 6: BON */}
          <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900">Bon Aktif</h2>
              <Link href="/bon" className="text-[11px] font-semibold text-brand-700">
                Lihat semua →
              </Link>
            </div>
            {report.bon.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-stone-200 px-3 py-4 text-center text-xs text-stone-400">
                Tidak ada bon aktif
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {report.bon.slice(0, 5).map((item) => (
                  <li
                    key={item.customerId}
                    className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-700">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs font-bold text-stone-900">
                        {formatIDR(item.unpaidTotal)}
                      </span>
                      <span className="block text-[10px] text-stone-400">
                        {item.bonCount} transaksi bon
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 7: EKSPOR — dirakit lokal, tanpa unggah data */}
          <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
            <h2 className="text-sm font-bold text-stone-900">Ekspor Laporan</h2>
            <p className="mt-1 text-[11px] text-stone-400">
              Berisi laporan {report.rangeLabel.toLowerCase()} — dibuat di
              perangkat, tanpa internet.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  downloadCsv(reportFilename(report, "csv"), reportToCsv(report))
                }
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 text-xs font-bold text-white active:scale-[0.98]"
              >
                <Icon name="chart" className="h-4 w-4" />
                Ekspor CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadPdf(reportFilename(report, "pdf"), reportToPdf(report))
                }
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-stone-900 bg-white text-xs font-bold text-stone-900 active:scale-[0.98]"
              >
                <Icon name="receipt" className="h-4 w-4" />
                Ekspor PDF
              </button>
            </div>
          </section>

          {transactions?.length === 0 ? (
            <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] text-stone-400">
              <Icon name="chart" className="h-4 w-4" />
              Laporan terisi otomatis dari transaksi warung Anda
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
