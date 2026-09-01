/**
 * PENJELAS LOKAL DETERMINISTIK (§8) — penyedia AI bawaan.
 *
 * Menyusun jawaban bahasa Indonesia langsung dari FAKTA terstruktur:
 * - selalu bisa jalan OFFLINE,
 * - tidak mungkin mengarang angka (semua kalimat dari fakta),
 * - menjadi cadangan otomatis saat model jarak jauh tidak tersedia.
 */

import { formatIDR, formatNumberID } from "@/lib/money";
import { formatDateID } from "@/lib/datetime";
import type { AiAnswer, AiExplainInput, AiProvider } from "./ai-provider";

const n = formatNumberID;

function sentence(facts: Record<string, unknown>): string {
  const f = facts as {
    period?: string;
    omzet?: number;
    transactionCount?: number;
    cashTotal?: number;
    cashCount?: number;
    bonTotal?: number;
    bonCount?: number;
    settlementReceived?: number;
    focus?: string;
    topProducts?: Array<{ name: string; quantity: number; revenue: number }>;
    zeroSoldCount?: number;
    slowSoldCount?: number;
    activeProductCount?: number;
    slowSamples?: Array<{ name: string; quantity: number }>;
    watchlist?: Array<{ name: string; stock: number; unit: string; soldLast7Days: number }>;
    lowByOwnerThreshold?: Array<{ name: string; stock: number; unit: string }>;
    activeBonCustomerCount?: number;
    totalUnpaid?: number;
    largest?: { name: string; unpaidTotal: number } | null;
    allActive?: Array<{ name: string; unpaidTotal: number }>;
    query?: string;
    matches?: Array<{
      name: string;
      unpaidTotal: number;
      bonTransactionCount: number;
      latest?: { date: string; total: number; status: string } | null;
    }>;
    productNotFound?: string;
    product?: string;
    stock?: number;
    unit?: string;
    currentPeriod?: string;
    previousPeriod?: string;
    currentOmzet?: number;
    previousOmzet?: number;
    currentCount?: number;
    previousCount?: number;
    diff?: number;
    diffPercent?: number | null;
    direction?: string;
    productsWithCostPrice?: number;
    totalProducts?: number;
    costDataAvailable?: boolean;
  };

  switch (f.focus) {
    case "cash":
      return `Penjualan tunai ${f.period}: ${formatIDR(f.cashTotal ?? 0)} dari ${n(f.cashCount ?? 0)} transaksi tunai.`;
  }

  if (f.omzet !== undefined && f.transactionCount !== undefined) {
    const parts = [
      `Omzet ${f.period} ${formatIDR(f.omzet)} dari ${n(f.transactionCount)} transaksi.`,
      `Tunai ${formatIDR(f.cashTotal ?? 0)} (${n(f.cashCount ?? 0)}), bon ${formatIDR(f.bonTotal ?? 0)} (${n(f.bonCount ?? 0)}).`,
    ];
    if ((f.settlementReceived ?? 0) > 0) {
      parts.push(`Pelunasan bon diterima ${formatIDR(f.settlementReceived ?? 0)} (terpisah dari omzet).`);
    }
    return parts.join(" ");
  }

  if (f.topProducts) {
    if (f.topProducts.length === 0) return `Belum ada penjualan ${f.period}.`;
    const [first, ...rest] = f.topProducts;
    const head = `Produk paling laku ${f.period}: ${first!.name} — ${n(first!.quantity)} terjual (${formatIDR(first!.revenue)}).`;
    if (rest.length > 0) {
      const tail = rest
        .slice(0, 2)
        .map((item) => `${item.name} (${n(item.quantity)} terjual)`)
        .join(", ");
      return `${head} Berikutnya: ${tail}.`;
    }
    return head;
  }

  if (f.zeroSoldCount !== undefined) {
    return `Dari ${n(f.activeProductCount ?? 0)} produk aktif dalam ${f.period}: ${n(f.zeroSoldCount)} tidak terjual sama sekali dan ${n(f.slowSoldCount ?? 0)} hanya terjual 1–2 pcs (aturan tetap: terjual ≤ 2).${
      f.slowSamples && f.slowSamples.length > 0
        ? ` Contoh: ${f.slowSamples.map((item) => `${item.name} (${n(item.quantity)})`).join(", ")}.`
        : ""
    } Daftar lengkap ada di Laporan → Jarang Terjual.`;
  }

  if (f.productNotFound) {
    return `Saya tidak menemukan produk "${f.productNotFound}" di data toko Anda. Cek ejaannya, atau lihat daftar produk di menu Produk.`;
  }
  if (f.product !== undefined) {
    return `Stok ${f.product}: ${n(f.stock ?? 0)} ${f.unit ?? "pcs"} (data perangkat).`;
  }
  if (f.watchlist) {
    const watch = f.watchlist ?? [];
    const threshold = f.lowByOwnerThreshold ?? [];
    if (watch.length === 0 && threshold.length === 0) {
      return `Stok aman: tidak ada produk aktif yang stoknya di bawah penjualan 7 hari terakhir (${n(f.activeProductCount ?? 0)} produk dipantau).`;
    }
    const parts: string[] = [];
    if (watch.length > 0) {
      parts.push(
        `${n(watch.length)} produk perlu diperhatikan — terjualnya 7 hari terakhir melebihi stok sekarang: ${watch
          .slice(0, 3)
          .map((item) => `${item.name} (stok ${n(item.stock)}, terjual ${n(item.soldLast7Days)})`)
          .join("; ")}.`,
      );
    }
    if (threshold.length > 0) {
      parts.push(
        `Batas menipis yang Anda tetapkan terlampaui pada ${n(threshold.length)} produk: ${threshold
          .slice(0, 3)
          .map((item) => `${item.name} (sisa ${n(item.stock)})`)
          .join(", ")}.`,
      );
    }
    return parts.join(" ");
  }

  if (f.query !== undefined && Array.isArray(f.matches)) {
    if (f.matches.length === 0) {
      return `Saya tidak menemukan pelanggan "${f.query}" yang punya bon aktif. Daftar bon aktif ada di menu Bayar Bon.`;
    }
    const first = f.matches[0]!;
    const latest = first.latest;
    const latestText = latest
      ? ` Terakhir ${formatDateID(`${latest.date}T12:00:00+07:00`)} sebesar ${formatIDR(latest.total)} (${latest.status === "UNPAID" ? "belum lunas" : "lunas"}).`
      : "";
    return `Bon ${first.name}: sisa ${formatIDR(first.unpaidTotal)} dari ${n(first.bonTransactionCount)} transaksi bon.${latestText}`;
  }

  if (f.activeBonCustomerCount !== undefined) {
    const count = f.activeBonCustomerCount ?? 0;
    if (count === 0) return `Tidak ada bon aktif — semua piutang sudah lunas.`;
    return `Saat ini ${n(count)} pelanggan punya bon belum lunas. Total ${formatIDR(f.totalUnpaid ?? 0)}.${
      f.largest ? ` Bon terbesar: ${f.largest.name} — ${formatIDR(f.largest.unpaidTotal)}.` : ""
    } Rincian ada di menu Bayar Bon.`;
  }

  if (f.currentOmzet !== undefined && f.previousOmzet !== undefined) {
    if (f.previousOmzet === 0) {
      return `Omzet ${f.currentPeriod} ${formatIDR(f.currentOmzet)} (${n(f.currentCount ?? 0)} transaksi). Belum ada data penjualan pada ${f.previousPeriod} untuk dibandingkan.`;
    }
    const percent = f.diffPercent ?? 0;
    return `Omzet ${f.currentPeriod} ${formatIDR(f.currentOmzet)} (${n(f.currentCount ?? 0)} transaksi), ${f.direction} ${formatIDR(Math.abs(f.diff ?? 0))} atau ${n(Math.abs(percent))}% dibanding ${f.previousPeriod} (${formatIDR(f.previousOmzet)}).`;
  }

  if (f.costDataAvailable !== undefined) {
    if (!f.costDataAvailable) {
      return `Saya belum bisa menghitung keuntungan karena data harga modal belum tersedia. Omzet ${f.period} ${formatIDR(f.omzet ?? 0)} — bisa dilihat detailnya di menu Laporan.`;
    }
    return `Baru ${n(f.productsWithCostPrice ?? 0)} dari ${n(f.totalProducts ?? 0)} produk yang punya harga modal, jadi keuntungan menyeluruh belum bisa dihitung. Omzet ${f.period} ${formatIDR(f.omzet ?? 0)}.`;
  }

  return "Data untuk pertanyaan itu belum tersedia di data toko Anda.";
}

/** Penyedia bawaan: menjawab deterministik, offline, tanpa model. */
export class LocalExplainerProvider implements AiProvider {
  readonly id = "local-deterministic";

  async explain(input: AiExplainInput): Promise<AiAnswer> {
    return { text: sentence(input.facts), mode: "lokal" };
  }
}

/** Jawaban untuk pertanyaan di luar cakupan data toko (anti-halusinasi). */
export function outOfScopeAnswer(): string {
  return "Saya hanya bisa menjawab dari data toko Anda — coba tanya soal omzet, produk terlaris, stok, atau bon. Contoh: \u201COmzet hari ini berapa?\u201D";
}

export { sentence as composeDeterministicAnswer };
