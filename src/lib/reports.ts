/**
 * AGREGASI LAPORAN (§7) — semua dihitung MURNI dari DATABASE TRANSAKSI &
 * PRODUK LOKAL. Tanpa internet, tanpa sumber data baru.
 *
 * Prinsip yang dijaga:
 * - OMZET = penjualan; PELUNASAN BON dicatat terpisah (bukan omzet —
 *   penjualan bonnya sudah dihitung pada hari transaksi bon dibuat).
 * - CASH + BON = OMZET (rekonsiliasi eksak, lihat uji smoke §7).
 * - Harga historis memakai SNAPSHOT harga saat transaksi (unitPrice/subtotal
 *   tersimpan di item) — perubahan harga produk TIDAK mengubah laporan lama.
 * - Batas hari/minggu/bulan mengikuti APP_TIME_ZONE (Asia/Jakarta), sama
 *   dengan jam yang ditampilkan aplikasi — bukan zona perangkat.
 *
 * Struktur keluaran (SalesSummary, TopProduct, SlowProduct, StockItem,
 * BonCustomerSummary, ReportDocument) sengaja DITATA & BER-TIPE agar bisa
 * ditanyakan lapisan berikutnya (persiapan §8) tanpa mengubah engine.
 */

import type { Customer, Product, Transaction } from "@/domain";
import { APP_TIME_ZONE, dayKeyInTZ, dayKeyToUTC } from "@/lib/datetime";

export type ReportRangeKey = "today" | "week" | "month";

export const REPORT_RANGES: Array<{ key: ReportRangeKey; label: string }> = [
  { key: "today", label: "Hari Ini" },
  { key: "week", label: "Minggu Ini" },
  { key: "month", label: "Bulan Ini" },
];

// ---------------------------------------------------------------------------
// Waktu periode — kalender asli (hari ini / minggu Senin–Minggu / tanggal 1)
// ---------------------------------------------------------------------------

function startOfTodayKey(now: Date): string {
  return dayKeyInTZ(now);
}

/** Kunci hari pertama periode menurut kalender Asia/Jakarta. */
export function rangeStartKey(range: ReportRangeKey, now = new Date()): string {
  const wall = new Date(now.getTime() + tzGap(now));
  const y = wall.getUTCFullYear();
  const m = wall.getUTCMonth();
  const d = wall.getUTCDate();
  if (range === "today") return utcToKey(y, m, d);
  if (range === "week") {
    // Minggu kalender Indonesia: Senin = hari pertama.
    const weekday = (wall.getUTCDay() + 6) % 7; // Sen=0 … Min=6
    return utcToKey(y, m, d - weekday);
  }
  return utcToKey(y, m, 1); // bulan kalender
}

/** Batas awal periode sebagai instan UTC (ms). */
export function rangeStart(range: ReportRangeKey, now = new Date()): Date {
  return new Date(dayKeyToUTC(rangeStartKey(range, now)));
}

function utcToKey(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}

/** Selisih ms dinding-waktu aplikasi vs UTC pada `date`. */
function tzGap(date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return (
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
      get("second"),
    ) - date.getTime()
  );
}

// ---------------------------------------------------------------------------
// Klasifikasi transaksi
// ---------------------------------------------------------------------------

/**
 * Transaksi PELUNASAN BON: dicatat CustomerService.settleBon sebagai
 * transaksi CASH tanpa item dengan catatan baku "Bayar Bon: <nama>".
 * Deterministik (format penulis sendiri); pada §8 sebaiknya diganti flag
 * eksplisit `kind` di entitas transaksi.
 */
export function isSettlementTransaction(transaction: Transaction): boolean {
  return (
    transaction.items.length === 0 &&
    transaction.note !== null &&
    transaction.note.startsWith("Bayar Bon:")
  );
}

/** Transaksi PENJUALAN (bukan pelunasan) dalam rentang [from, now]. */
function salesInPeriod(
  transactions: Transaction[],
  fromMs: number,
): Transaction[] {
  return transactions.filter(
    (trx) =>
      !isSettlementTransaction(trx) &&
      new Date(trx.timestamp).getTime() >= fromMs &&
      trx.status === "COMPLETED",
  );
}

// ---------------------------------------------------------------------------
// Ringkasan omzet
// ---------------------------------------------------------------------------

export interface SalesSummary {
  omzet: number;
  transactionCount: number;
  /** Total penjualan bon (bayar nanti). */
  bonTotal: number;
  bonCount: number;
  cashTotal: number;
  cashCount: number;
  /** Uang pelunasan bon yang DITERIMA di periode ini (bukan omzet). */
  settlementTotal: number;
  settlementCount: number;
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
    cashCount: 0,
    settlementTotal: 0,
    settlementCount: 0,
  };
  for (const trx of transactions) {
    if (new Date(trx.timestamp).getTime() < from) continue;
    if (trx.status !== "COMPLETED") continue;
    if (isSettlementTransaction(trx)) {
      summary.settlementTotal += trx.total;
      summary.settlementCount += 1;
      continue;
    }
    summary.omzet += trx.total;
    summary.transactionCount += 1;
    if (trx.paymentType === "BON") {
      summary.bonTotal += trx.total;
      summary.bonCount += 1;
    } else {
      summary.cashTotal += trx.total;
      summary.cashCount += 1;
    }
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Produk terlaris & jarang terjual
// ---------------------------------------------------------------------------

export interface TopProduct {
  productId: string | null;
  name: string;
  quantity: number;
  revenue: number;
}

/** Produk terlaris pada periode (jumlah terjual, lalu nilai) — harga snapshot. */
export function topProducts(
  transactions: Transaction[],
  range: ReportRangeKey,
  limit = 5,
  now = new Date(),
): TopProduct[] {
  const from = rangeStart(range, now).getTime();
  const tally = new Map<string, TopProduct>();
  for (const trx of salesInPeriod(transactions, from)) {
    for (const item of trx.items) {
      const key = item.productId ?? item.productName;
      const current = tally.get(key) ?? {
        productId: item.productId,
        name: item.productName,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += item.subtotal;
      tally.set(key, current);
    }
  }
  return [...tally.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, limit);
}

export interface SlowProduct {
  productId: string;
  name: string;
  quantity: number;
  stock: number;
  unit: string;
}

/**
 * Ambang ATURAN TERDETERMINISTIK (bukan AI): produk aktif dengan total
 * terjual ≤ maxSold selama periode. Nilai default dikonfigurasi di sini
 * sesuai spesifikasi §7 — bukan kesimpulan "cerdas".
 */
export const SLOW_MOVING_MAX_SOLD_DEFAULT = 2;

/** Produk jarang terjual pada periode (aturan deterministik, urut paling sepi). */
export function slowMovingProducts(
  transactions: Transaction[],
  products: Product[],
  range: ReportRangeKey,
  options: { maxSold?: number; limit?: number } = {},
  now = new Date(),
): SlowProduct[] {
  const maxSold = options.maxSold ?? SLOW_MOVING_MAX_SOLD_DEFAULT;
  const limit = options.limit ?? 15;
  const from = rangeStart(range, now).getTime();
  const sold = new Map<string, number>();
  for (const trx of salesInPeriod(transactions, from)) {
    for (const item of trx.items) {
      sold.set(item.productId, (sold.get(item.productId) ?? 0) + item.quantity);
    }
  }
  return products
    .filter((product) => product.isActive)
    .map((product) => ({
      productId: product.id,
      name: product.name,
      quantity: sold.get(product.id) ?? 0,
      stock: product.stock,
      unit: product.unit,
    }))
    .filter((item) => item.quantity <= maxSold)
    .sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Rincian harian
// ---------------------------------------------------------------------------

export interface DailyTotal {
  /** Kunci hari YYYY-MM-DD (Asia/Jakarta). */
  key: string;
  /** Label singkat (cth. "Sen" / "12"). */
  label: string;
  total: number;
  transactionCount: number;
}

/** Omzet per hari untuk N hari terakhir (urut lama → baru) — grafik. */
export function dailyTotals(
  transactions: Transaction[],
  days = 7,
  now = new Date(),
): DailyTotal[] {
  const todayKey = startOfTodayKey(now);
  const buckets: DailyTotal[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = new Date(dayKeyToUTC(todayKey) - i * 86_400_000)
      .toISOString()
      .slice(0, 10);
    buckets.push({
      key,
      label: new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: APP_TIME_ZONE }).format(
        new Date(dayKeyToUTC(key) + 12 * 3_600_000),
      ),
      total: 0,
      transactionCount: 0,
    });
  }
  const from = dayKeyToUTC(buckets[0]!.key);
  for (const trx of transactions) {
    const at = new Date(trx.timestamp).getTime();
    if (at < from) continue;
    const key = dayKeyInTZ(new Date(trx.timestamp));
    const bucket = buckets.find((item) => item.key === key);
    if (bucket) {
      bucket.total += trx.total;
      bucket.transactionCount += 1;
    }
  }
  return buckets;
}

/** Rincian harian sesuai periode terpilih (grafik/list di dashboard). */
export function breakdownForRange(
  transactions: Transaction[],
  range: ReportRangeKey,
  now = new Date(),
): DailyTotal[] {
  if (range === "month") {
    const startKey = rangeStartKey("month", now);
    const startMs = dayKeyToUTC(startKey);
    const todayKey = startOfTodayKey(now);
    const days: DailyTotal[] = [];
    for (let key = startKey; key <= todayKey; key = nextDayKey(key)) {
      days.push({
        key,
        label: key.slice(8, 10), // tanggal (01–31)
        total: 0,
        transactionCount: 0,
      });
    }
    for (const trx of transactions) {
      const at = new Date(trx.timestamp).getTime();
      if (at < startMs || isSettlementTransaction(trx)) continue;
      const bucket = days.find((item) => item.key === dayKeyInTZ(new Date(trx.timestamp)));
      if (bucket) {
        bucket.total += trx.total;
        bucket.transactionCount += 1;
      }
    }
    return days;
  }
  return dailyTotals(transactions, range === "today" ? 7 : 7, now);
}

function nextDayKey(key: string): string {
  // Aritmetika KALENDER pada kunci (bukan instan UTC): dayKeyToUTC(key)
  // jatuh di 17.00Z hari sebelumnya, sehingga +24 jam lalu dipotong ke
  // tanggal UTC akan mengembalikan kunci yang sama (loop tak berujung).
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + 1)).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Stok & bon
// ---------------------------------------------------------------------------

export interface StockItem {
  productId: string;
  name: string;
  stock: number;
  unit: string;
  /** Batas yang DITETAPKAN pemilik (null = belum ditetapkan → tanpa penanda). */
  threshold: number | null;
  lowStock: boolean;
}

/**
 * Stok saat ini dari basis data produk LOKAL (bukan database kedua).
 * Penanda "menipis" HANYA muncul bila pemilik menetapkan batas per produk —
 * tidak ada aturan otomatis yang diciptakan (aturan §7).
 */
export function stockOverview(
  products: Product[],
  thresholds: Record<string, number> = {},
  limit?: number,
): StockItem[] {
  const items = products
    .filter((product) => product.isActive)
    .map((product) => {
      const threshold = thresholds[product.id] ?? null;
      return {
        productId: product.id,
        name: product.name,
        stock: product.stock,
        unit: product.unit,
        threshold,
        lowStock: threshold !== null && product.stock <= threshold,
      };
    })
    .sort(
      (a, b) =>
        Number(b.lowStock) - Number(a.lowStock) || a.stock - b.stock || a.name.localeCompare(b.name),
    );
  return limit === undefined ? items : items.slice(0, limit);
}

export interface BonCustomerSummary {
  customerId: string;
  name: string;
  /** Sisa piutang SAAT INI (otoritatif: saldo pelanggan lokal). */
  unpaidTotal: number;
  /** Jumlah transaksi BON pelanggan ini (dari data transaksi). */
  bonCount: number;
}

/** Ringkasan pelanggan yang masih punya bon — cari lokal, instan. */
export function bonCustomerSummaries(
  customers: Customer[],
  transactions: Transaction[],
  limit?: number,
): BonCustomerSummary[] {
  const bonCounts = new Map<string, number>();
  for (const trx of transactions) {
    if (trx.paymentType !== "BON" || !trx.customer?.id) continue;
    bonCounts.set(trx.customer.id, (bonCounts.get(trx.customer.id) ?? 0) + 1);
  }
  const items = customers
    .filter((customer) => customer.outstandingBalance > 0)
    .map((customer) => ({
      customerId: customer.id,
      name: customer.name,
      unpaidTotal: customer.outstandingBalance,
      bonCount: bonCounts.get(customer.id) ?? 0,
    }))
    .sort((a, b) => b.unpaidTotal - a.unpaidTotal || a.name.localeCompare(b.name));
  return limit === undefined ? items : items.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Dokumen laporan — struktur tunggal untuk UI, ekspor, dan lapisan §8
// ---------------------------------------------------------------------------

export interface ReportDocument {
  range: ReportRangeKey;
  rangeLabel: string;
  generatedAt: string;
  timeZone: string;
  periodStartKey: string;
  summary: SalesSummary;
  breakdown: DailyTotal[];
  topProducts: TopProduct[];
  slowProducts: SlowProduct[];
  stock: StockItem[];
  bon: BonCustomerSummary[];
}

export function buildReportDocument(input: {
  transactions: Transaction[];
  products: Product[];
  customers: Customer[];
  range: ReportRangeKey;
  stockThresholds?: Record<string, number>;
  now?: Date;
}): ReportDocument {
  const now = input.now ?? new Date();
  return {
    range: input.range,
    rangeLabel: REPORT_RANGES.find((item) => item.key === input.range)?.label ?? input.range,
    generatedAt: now.toISOString(),
    timeZone: APP_TIME_ZONE,
    periodStartKey: rangeStartKey(input.range, now),
    summary: summarizeTransactions(input.transactions, input.range, now),
    breakdown: breakdownForRange(input.transactions, input.range, now),
    topProducts: topProducts(input.transactions, input.range, 10, now),
    slowProducts: slowMovingProducts(
      input.transactions,
      input.products,
      input.range,
      {},
      now,
    ),
    stock: stockOverview(input.products, input.stockThresholds ?? {}, 20),
    bon: bonCustomerSummaries(input.customers, input.transactions, 10),
  };
}
