/**
 * DETEKSI INTENSI (§8) — deterministik dari kata kunci bahasa Indonesia.
 * Bukan AI: pemetaan pertanyaan → jenis data + periode yang perlu DIAMbil.
 * LLM tidak pernah memilih data; lapisan ini yang memutuskan.
 */

import type { ReportRangeKey } from "@/lib/reports";

export type AiIntentKind =
  | "SALES"
  | "PRODUCT_TOP"
  | "PRODUCT_SLOW"
  | "STOCK"
  | "BON"
  | "COMPARE"
  | "PROFIT"
  | "UNKNOWN";

export interface AiIntent {
  kind: AiIntentKind;
  range: ReportRangeKey;
  /** Fokus metrik penjualan (bila ditanya spesifik tunai/bon). */
  focus?: "cash" | "bon";
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s%]/gu, " ").replace(/\s+/g, " ").trim();
}

export function detectIntent(question: string): AiIntent {
  const q = normalize(question);
  const range = detectRange(q);

  if (/(keuntungan|keuntungaan|laba|profit|untung\b)/.test(q)) {
    return { kind: "PROFIT", range };
  }
  if (/(bon\b|piutang|utang)/.test(q)) {
    return { kind: "BON", range };
  }
  if (/(stok|stock|persediaan|sisa barang|perhatikan|waspada)/.test(q)) {
    return { kind: "STOCK", range };
  }
  if (/(naik|turun|persen|%|dibanding|bandingkan|banding|lebih bagus|lebih baik|vs\b)/.test(q)) {
    return { kind: "COMPARE", range };
  }
  if (/(sepi|jarang terjual|tidak laku|kurang laku|slow)/.test(q)) {
    // Pertanyaan "sepi" paling bergeli pada jendela 30 hari.
    return { kind: "PRODUCT_SLOW", range: q.includes("hari ini") ? "today" : "month" };
  }
  if (/(laku|terjual|dibeli|produk|peringkat|rank)/.test(q)) {
    return { kind: "PRODUCT_TOP", range };
  }
  if (/(omzet|omset|penjualan|transaksi|tunai|cash|jual|pendapatan|uar)/.test(q)) {
    return {
      kind: "SALES",
      range,
      focus: /(tunai|cash)/.test(q) ? "cash" : undefined,
    };
  }
  return { kind: "UNKNOWN", range };
}

function detectRange(q: string): ReportRangeKey {
  if (/(hari ini|today|sekarang)/.test(q)) return "today";
  if (/(minggu ini|7 hari|seminggu)/.test(q)) return "week";
  if (/(bulan ini|sebulan|bulan lalu|minggu lalu)/.test(q)) {
    // "dibanding minggu lalu" tetap membandingkan MINGGU — pakai week.
    return q.includes("bulan") ? "month" : "week";
  }
  if (/minggu/.test(q)) return "week";
  if (/bulan/.test(q)) return "month";
  return "today";
}
