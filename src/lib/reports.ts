/**
 * Agregasi penjualan dari DATABASE TRANSAKSI LOKAL — dipakai Beranda,
 * Transaksi, dan Laporan. Semua perhitungan offline (tanpa internet).
 */

import type { Transaction } from "@/domain";

export type ReportRangeKey = "today" | "week" | "month";

/** Batas awal periode menurut zona waktu perangkat. */
export function rangeStart(range: ReportRangeKey, now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === "week") start.setDate(start.getDate() - 6); // 7 hari terakhir
  if (range === "month") start.setDate(start.getDate() - 29); // 30 hari terakhir
  return start;
}

export interface SalesSummary {
  omzet: number;
  transactionCount: number;
  /** Total penjualan bon (bayar nanti). */
  bonTotal: number;
  bonCount: number;
  cashTotal: number;
}

export function summarizeTransactions(
  transactions: Transaction[],
  range: ReportRangeKey,
  now = new Date(),
): SalesSummary {
  const from = rangeStart(range, now).getTime();
  const summary: SalesSummary = {
    omzet: 0,
    transactionCount: 0,
    bonTotal: 0,
    bonCount: 0,
    cashTotal: 0,
  };
  for (const trx of transactions) {
    const at = new Date(trx.timestamp).getTime();
    if (at < from) continue;
    summary.omzet += trx.total;
    summary.transactionCount += 1;
    if (trx.paymentType === "BON") {
      summary.bonTotal += trx.total;
      summary.bonCount += 1;
    } else {
      summary.cashTotal += trx.total;
    }
  }
  return summary;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

/** Produk terlaris pada periode (jumlah terjual, lalu nilai). */
export function topProducts(
  transactions: Transaction[],
  range: ReportRangeKey,
  limit = 5,
  now = new Date(),
): TopProduct[] {
  const from = rangeStart(range, now).getTime();
  const tally = new Map<string, TopProduct>();
  for (const trx of transactions) {
    if (new Date(trx.timestamp).getTime() < from) continue;
    for (const item of trx.items) {
      const current = tally.get(item.productName) ?? {
        name: item.productName,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += item.subtotal;
      tally.set(item.productName, current);
    }
  }
  return [...tally.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, limit);
}

export interface DailyTotal {
  /** Label singkat hari (cth. "Sen"). */
  label: string;
  total: number;
}

/** Omzet per hari untuk grafik 7 hari terakhir (urut lama → baru). */
export function dailyTotals(
  transactions: Transaction[],
  days = 7,
  now = new Date(),
): DailyTotal[] {
  const buckets: DailyTotal[] = [];
  const byIndex = new Map<number, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const index = buckets.length;
    byIndex.set(index, 0);
    buckets.push({
      label: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(day),
      total: 0,
    });
  }
  const firstDay = new Date(now);
  firstDay.setHours(0, 0, 0, 0);
  firstDay.setDate(firstDay.getDate() - (days - 1));
  const from = firstDay.getTime();
  for (const trx of transactions) {
    const at = new Date(trx.timestamp).getTime();
    if (at < from) continue;
    const day = new Date(trx.timestamp);
    day.setHours(0, 0, 0, 0);
    const index = Math.round((day.getTime() - from) / 86_400_000);
    if (index >= 0 && index < buckets.length) {
      buckets[index].total += trx.total;
    }
  }
  return buckets;
}
