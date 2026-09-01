/**
 * LAPISAN AKSES DATA UNTUK AI (§8) — SATU-SATUNYA jalan AI membaca data toko.
 *
 * Prinsip:
 * - Semua angka dihitung DETERMINISTIK di sini (total, selisih, persen,
 *   jumlah) — LLM hanya MENJELASKAN hasil, tidak berhitung.
 * - FAKTA yang dikembalikan adalah payload MINIMAL (ringkasan, bukan
 *   transaksi mentah) — menjaga privasi data warung.
 * - Memakai SKEMA & LAPISAN yang sudah ada (lib/reports, domain) —
 *   tidak ada dataset ganda.
 */

import type { Customer, Product, Transaction } from "@/domain";
import { APP_TIME_ZONE, dayKeyInTZ, dayKeyToUTC, formatDateID } from "@/lib/datetime";
import {
  bonCustomerSummaries,
  isSettlementTransaction,
  rangeStart,
  rangeStartKey,
  REPORT_RANGES,
  summarizeTransactions,
  topProducts,
  type ReportRangeKey,
} from "@/lib/reports";
import type { AiIntent } from "./intent";

export interface AiDataset {
  transactions: Transaction[];
  products: Product[];
  customers: Customer[];
  stockThresholds: Record<string, number>;
}

export interface AiToolResult {
  intent: AiIntent["kind"];
  /** Label sumber data (ditampilkan di bawah jawaban). */
  sourceLabel: string;
  /** Payload minimal untuk provider AI + jawaban deterministik. */
  facts: Record<string, unknown>;
}

const RANGE_NOUN: Record<ReportRangeKey, string> = {
  today: "hari ini",
  week: "minggu ini",
  month: "bulan ini",
};

function periodDateLabel(range: ReportRangeKey, now: Date): string {
  const startKey = rangeStartKey(range, now);
  const endKey = dayKeyInTZ(now);
  const from = formatDateID(`${startKey}T12:00:00+07:00`);
  const to = formatDateID(`${endKey}T12:00:00+07:00`);
  return from === to ? from : `${from} – ${to}`;
}

function salesSourceLabel(range: ReportRangeKey, now: Date): string {
  return `Transaksi ${RANGE_NOUN[range]} (${periodDateLabel(range, now)} WIB) · data perangkat`;
}

// --------------------------------------------------------------- SALES

export function getSalesSummary(
  data: AiDataset,
  range: ReportRangeKey,
  now: Date,
  focus?: "cash" | "bon",
): AiToolResult {
  const summary = summarizeTransactions(data.transactions, range, now);
  return {
    intent: "SALES",
    sourceLabel: salesSourceLabel(range, now),
    facts: {
      period: RANGE_NOUN[range],
      periodDates: periodDateLabel(range, now),
      omzet: summary.omzet,
      transactionCount: summary.transactionCount,
      cashTotal: summary.cashTotal,
      cashCount: summary.cashCount,
      bonTotal: summary.bonTotal,
      bonCount: summary.bonCount,
      settlementReceived: summary.settlementTotal,
      ...(focus ? { focus } : {}),
    },
  };
}

// ----------------------------------------------------------- PRODUCT

export function getProductSales(
  data: AiDataset,
  range: ReportRangeKey,
  now: Date,
  mode: "top" | "slow",
): AiToolResult {
  if (mode === "top") {
    const best = topProducts(data.transactions, range, 5, now);
    return {
      intent: "PRODUCT_TOP",
      sourceLabel: salesSourceLabel(range, now),
      facts: {
        period: RANGE_NOUN[range],
        periodDates: periodDateLabel(range, now),
        topProducts: best.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          revenue: item.revenue,
        })),
      },
    };
  }
  // JARANG TERJUAL — aturan deterministik: terjual ≤ 2 pada periode.
  const fromMs = rangeStart(range, now).getTime();
  const sold = new Map<string, number>();
  for (const trx of data.transactions) {
    if (isSettlementTransaction(trx) || trx.status !== "COMPLETED") continue;
    if (new Date(trx.timestamp).getTime() < fromMs) continue;
    for (const item of trx.items) {
      sold.set(item.productId ?? item.productName, (sold.get(item.productId ?? item.productName) ?? 0) + item.quantity);
    }
  }
  const active = data.products.filter((product) => product.isActive);
  let zeroCount = 0;
  const lowSamples: Array<{ name: string; quantity: number; stock: number }> = [];
  for (const product of active) {
    const quantity = sold.get(product.id) ?? 0;
    if (quantity === 0) {
      zeroCount += 1;
    } else if (quantity <= 2) {
      lowSamples.push({ name: product.name, quantity, stock: product.stock });
    }
  }
  lowSamples.sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name));
  return {
    intent: "PRODUCT_SLOW",
    sourceLabel: salesSourceLabel(range, now),
    facts: {
      period: RANGE_NOUN[range],
      periodDates: periodDateLabel(range, now),
      activeProductCount: active.length,
      zeroSoldCount: zeroCount,
      slowSoldCount: lowSamples.length,
      slowRule: "terjual <= 2 pada periode (aturan tetap, bukan penilaian AI)",
      slowSamples: lowSamples.slice(0, 3),
    },
  };
}

// -------------------------------------------------------------- STOCK

export function getStockStatus(
  data: AiDataset,
  now: Date,
  question?: string,
): AiToolResult {
  // Pertanyaan stok PRODUK TERTENTU: "stok aqua berapa?"
  const specific = matchProductInQuestion(question ?? "", data.products);
  if (specific !== undefined) {
    if (!specific.found) {
      return {
        intent: "STOCK",
        sourceLabel: "Katalog produk perangkat",
        facts: { productNotFound: specific.candidate },
      };
    }
    const match = specific.found;
    return {
      intent: "STOCK",
      sourceLabel: `Katalog produk perangkat (${formatDateID(now.toISOString())})`,
      facts: {
        product: match.name,
        stock: match.stock,
        unit: match.unit,
        threshold: data.stockThresholds[match.id] ?? null,
      },
    };
  }

  // Aturan DETERMINISTIK "perlu diperhatikan": produk aktif yang terjual
  // 7 hari terakhir LEBIH BANYAK daripada stok sekarang (stok < kebutuhan
  // ±1 minggu). Tanpa prediksi/forecast — hanya fakta penjualan nyata.
  const weekStartMs = rangeStart("week", now).getTime();
  const sold7 = new Map<string, number>();
  for (const trx of data.transactions) {
    if (isSettlementTransaction(trx) || trx.status !== "COMPLETED") continue;
    if (new Date(trx.timestamp).getTime() < weekStartMs) continue;
    for (const item of trx.items) {
      sold7.set(item.productId, (sold7.get(item.productId) ?? 0) + item.quantity);
    }
  }
  const watchlist = data.products
    .filter((product) => product.isActive && product.stock > 0)
    .map((product) => ({
      name: product.name,
      stock: product.stock,
      unit: product.unit,
      soldLast7Days: sold7.get(product.id) ?? 0,
      threshold: data.stockThresholds[product.id] ?? null,
    }))
    .filter((item) => item.soldLast7Days > 0 && item.stock < item.soldLast7Days)
    .sort((a, b) => b.soldLast7Days - a.soldLast7Days)
    .slice(0, 5);
  const lowByThreshold = data.products
    .filter(
      (product) =>
        product.isActive &&
        data.stockThresholds[product.id] !== undefined &&
        product.stock <= data.stockThresholds[product.id]!,
    )
    .slice(0, 5)
    .map((product) => ({
      name: product.name,
      stock: product.stock,
      unit: product.unit,
      threshold: data.stockThresholds[product.id]!,
    }));
  const activeCount = data.products.filter((product) => product.isActive).length;
  return {
    intent: "STOCK",
    sourceLabel: `Stok perangkat & penjualan 7 hari terakhir (${periodDateLabel("week", now)} WIB)`,
    facts: {
      activeProductCount: activeCount,
      watchRule: "stok sekarang < terjual 7 hari terakhir (aturan tetap)",
      watchlist,
      lowByOwnerThreshold: lowByThreshold,
    },
  };
}

// ----------------------------------------------------------------- BON

export function getBonSummary(data: AiDataset): AiToolResult {
  const summaries = bonCustomerSummaries(data.customers, data.transactions);
  const totalUnpaid = summaries.reduce((sum, item) => sum + item.unpaidTotal, 0);
  return {
    intent: "BON",
    sourceLabel: "Data bon & pelanggan tersimpan di perangkat",
    facts: {
      activeBonCustomerCount: summaries.length,
      totalUnpaid,
      largest: summaries[0]
        ? { name: summaries[0].name, unpaidTotal: summaries[0].unpaidTotal }
        : null,
      allActive: summaries.slice(0, 7).map((item) => ({
        name: item.name,
        unpaidTotal: item.unpaidTotal,
        bonCount: item.bonCount,
      })),
    },
  };
}

export function getCustomerBon(data: AiDataset, nameQuery: string): AiToolResult {
  const q = nameQuery.toLowerCase();
  const matches = data.customers
    .filter((customer) => customer.outstandingBalance > 0)
    .filter((customer) => customer.name.toLowerCase().includes(q))
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance);
  const details = matches.slice(0, 3).map((customer) => {
    const bonTrxs = data.transactions
      .filter(
        (trx) =>
          trx.paymentType === "BON" &&
          trx.customer?.id === customer.id &&
          !isSettlementTransaction(trx),
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return {
      name: customer.name,
      unpaidTotal: customer.outstandingBalance,
      bonTransactionCount: bonTrxs.length,
      latest: bonTrxs[0]
        ? { date: bonTrxs[0].timestamp.slice(0, 10), total: bonTrxs[0].total, status: bonTrxs[0].paymentStatus }
        : null,
    };
  });
  return {
    intent: "BON",
    sourceLabel: "Data bon & pelanggan tersimpan di perangkat",
    facts: { query: nameQuery, matches: details },
  };
}

// ------------------------------------------------------------ COMPARE

export interface PeriodComparison {
  currentLabel: string;
  previousLabel: string;
  currentOmzet: number;
  previousOmzet: number;
  currentCount: number;
  previousCount: number;
  diff: number;
  diffPercent: number | null;
  direction: "naik" | "turun" | "sama";
}

/**
 * Perbandingan DETERMINISTIK: periode sekarang vs periode sebelumnya dengan
 * JUMLAH HARI SAMA (minggu: Sen s/d hari ini vs Sen lalu s/d hari yang sama;
 * bulan: tgl 1 s/d hari ini vs tgl 1 bulan lalu s/d tanggal yang sama).
 */
export function compareSalesPeriods(
  data: AiDataset,
  range: ReportRangeKey,
  now: Date,
): AiToolResult & { comparison: PeriodComparison } {
  const todayKey = dayKeyInTZ(now);
  const startKey = rangeStartKey(range, now);
  const daysElapsed = Math.round(
    (dayKeyToUTC(todayKey) - dayKeyToUTC(startKey)) / 86_400_000,
  ) + 1;

  // Awal periode sebelumnya (kalender).
  const [y, m, d] = startKey.split("-").map(Number);
  let prevStartKey: string;
  if (range === "today") {
    prevStartKey = new Date(Date.UTC(y!, m! - 1, d! - 1)).toISOString().slice(0, 10);
  } else if (range === "week") {
    prevStartKey = new Date(Date.UTC(y!, m! - 1, d! - 7)).toISOString().slice(0, 10);
  } else {
    prevStartKey = new Date(Date.UTC(y!, m! - 2, 1)).toISOString().slice(0, 10);
  }
  const [py, pm, pd] = prevStartKey.split("-").map(Number);
  const prevEndExclusive = new Date(
    Date.UTC(py!, pm! - 1, pd! + daysElapsed),
  ).toISOString().slice(0, 10);

  const sum = (fromMs: number, toMs: number) => {
    let omzet = 0;
    let count = 0;
    for (const trx of data.transactions) {
      if (isSettlementTransaction(trx) || trx.status !== "COMPLETED") continue;
      const at = new Date(trx.timestamp).getTime();
      if (at >= fromMs && at < toMs) {
        omzet += trx.total;
        count += 1;
      }
    }
    return { omzet, count };
  };
  const current = sum(dayKeyToUTC(startKey), now.getTime() + 1);
  const previous = sum(dayKeyToUTC(prevStartKey), dayKeyToUTC(prevEndExclusive));

  const diff = current.omzet - previous.omzet;
  const diffPercent =
    previous.omzet > 0 ? Math.round((diff / previous.omzet) * 100) : null;
  const comparison: PeriodComparison = {
    currentLabel: RANGE_NOUN[range],
    previousLabel:
      range === "today"
        ? "kemarin"
        : range === "week"
          ? "minggu lalu"
          : "bulan lalu",
    currentOmzet: current.omzet,
    previousOmzet: previous.omzet,
    currentCount: current.count,
    previousCount: previous.count,
    diff,
    diffPercent,
    direction: diff > 0 ? "naik" : diff < 0 ? "turun" : "sama",
  };
  return {
    intent: "COMPARE",
    sourceLabel: `Transaksi ${comparison.currentLabel} vs ${comparison.previousLabel} (${periodDateLabel(range, now)} WIB) · data perangkat`,
    facts: {
      currentPeriod: comparison.currentLabel,
      previousPeriod: comparison.previousLabel,
      currentOmzet: comparison.currentOmzet,
      currentCount: comparison.currentCount,
      previousOmzet: comparison.previousOmzet,
      previousCount: comparison.previousCount,
      diff,
      diffPercent,
      direction: comparison.direction,
      daysCompared: daysElapsed,
    },
    comparison,
  };
}

// -------------------------------------------------------------- PROFIT

export function getProfitStatus(
  data: AiDataset,
  range: ReportRangeKey,
  now: Date,
): AiToolResult {
  const withCost = data.products.filter(
    (product) => product.costPrice !== null && product.costPrice > 0,
  ).length;
  const summary = summarizeTransactions(data.transactions, range, now);
  return {
    intent: "PROFIT",
    sourceLabel: `Katalog produk & transaksi ${RANGE_NOUN[range]} · data perangkat`,
    facts: {
      productsWithCostPrice: withCost,
      totalProducts: data.products.length,
      costDataAvailable: withCost > 0,
      period: RANGE_NOUN[range],
      omzet: summary.omzet,
    },
  };
}

// ------------------------------------------------------------- router

/** Jalankan tool sesuai intensi — satu pertanyaan → satu kueri terarah. */
export function runToolForIntent(
  data: AiDataset,
  intent: AiIntent,
  now: Date,
  question: string,
): AiToolResult | null {
  switch (intent.kind) {
    case "SALES":
      return getSalesSummary(data, intent.range, now, intent.focus);
    case "PRODUCT_TOP":
      return getProductSales(data, intent.range, now, "top");
    case "PRODUCT_SLOW":
      return getProductSales(data, intent.range, now, "slow");
    case "STOCK":
      return getStockStatus(data, now, question);
    case "BON":
      return getBonSummary(data);
    case "COMPARE":
      return compareSalesPeriods(data, intent.range, now);
    case "PROFIT":
      return getProfitStatus(data, intent.range, now);
    default:
      return null;
  }
}

const QUESTION_FILLER_WORDS = new Set([
  "stok", "stock", "berapa", "tinggal", "sisa", "masih", "apa", "yang",
  "perlu", "saya", "perhatikan", "mulai", "sedikit", "dikit", "sekarang",
  "toko", "di", "ada", "ini", "udah", "gak", "ga", "nggak", "belum",
  "dibeli", "orang", "banyak", "sepi", "laku", "buat", "and",
  "produk", "barang", "menipis", "habis", "kapan", "tolong", "cek",
]);

/**
 * Cari produk yang DISEBUT pertanyaan. Return:
 * - undefined → pertanyaan umum (tanpa produk spesifik),
 * - { found: product } → produk ketemu,
 * - { found: null, candidate } → ada frasa kandidat tapi tak ada di katalog
 *   (dijawab jujur "tidak ditemukan" — bukan dikarang).
 */
export function matchProductInQuestion(
  question: string,
  products: Product[],
): { found: Product } | { found: null; candidate: string } | undefined {
  const q = question.toLowerCase();
  // 1) Nama lengkap produk disebut apa adanya.
  const byName = products.find(
    (product) => product.isActive && q.includes(product.name.toLowerCase()),
  );
  if (byName) return { found: byName };
  // 2) Kata bermakna tersisa setelah kata tanya dibuang → kandidat nama.
  const candidate = q
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !QUESTION_FILLER_WORDS.has(word))
    .join(" ")
    .trim();
  if (!candidate) return undefined;
  // Kata kandidat cocok dengan kata dalam nama produk?
  const byWord = products.find((product) => {
    if (!product.isActive) return false;
    const nameWords = product.name.toLowerCase().split(/\s+/);
    return candidate
      .split(/\s+/)
      .some((word) => nameWords.includes(word) && word.length > 3);
  });
  if (byWord) return { found: byWord };
  // Ada kata benda spesifik (kandidat) yang bukan kata tanya → tidak ditemukan.
  if (candidate.split(/\s+/).length > 0 && candidate.length > 3) {
    return { found: null, candidate };
  }
  return undefined;
}

export { REPORT_RANGES, APP_TIME_ZONE };
