/**
 * EKSPOR LAPORAN (§7) — CSV & PDF dirakit SEPENUHNYA di perangkat dari
 * dokumen laporan lokal (lib/reports). Tidak ada data yang dikirim ke
 * server untuk membuat ekspor. CSV memakai pemisah ";" + BOM agar langsung
 * rapi dibuka Excel Indonesia.
 */

import { formatDateTimeID } from "@/lib/datetime";
import { formatIDR } from "@/lib/money";
import { createTextPdf, type PdfLine } from "@/lib/pdf";
import type { ReportDocument } from "@/lib/reports";
import type { Transaction } from "@/domain";

// --------------------------------------------------------------------- CSV

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  if (/[";\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvRow(cells: Array<string | number | null>): string {
  return cells.map(csvCell).join(";");
}

/** CSV ringkasan laporan sesuai periode yang SEDANG dipilih pengguna. */
export function reportToCsv(report: ReportDocument): string {
  const rows: Array<Array<string | number | null>> = [
    ["Laporan Penjualan Warungku"],
    ["Periode", report.rangeLabel],
    ["Mulai periode", report.periodStartKey],
    ["Dibuat", formatDateTimeID(report.generatedAt)],
    ["Zona waktu", `${report.timeZone} (WIB)`],
    [],
    ["RINGKASAN"],
    ["Omzet", report.summary.omzet],
    ["Jumlah transaksi", report.summary.transactionCount],
    ["Tunai (CASH)", report.summary.cashTotal],
    ["Jumlah transaksi tunai", report.summary.cashCount],
    ["Bon (BON)", report.summary.bonTotal],
    ["Jumlah transaksi bon", report.summary.bonCount],
    ["Pelunasan bon diterima", report.summary.settlementTotal],
    ["Cek: Tunai + Bon", report.summary.cashTotal + report.summary.bonTotal],
    [],
    ["RINCIAN HARIAN", "Tanggal", "Omzet", "Jumlah transaksi"],
  ];
  for (const day of report.breakdown) {
    rows.push(["", day.key, day.total, day.transactionCount]);
  }
  rows.push([], ["PRODUK TERLARIS", "Peringkat", "Nama", "Terjual", "Omzet"]);
  report.topProducts.forEach((item, index) => {
    rows.push(["", index + 1, item.name, item.quantity, item.revenue]);
  });
  rows.push([], ["PRODUK JARANG TERJUAL", "Nama", "Terjual", "Sisa stok", "Satuan"]);
  for (const item of report.slowProducts) {
    rows.push(["", item.name, item.quantity, item.stock, item.unit]);
  }
  rows.push([], ["STOK (atas)", "Nama", "Stok", "Satuan", "Batas menipis", "Menipis"]);
  for (const item of report.stock) {
    rows.push([
      "",
      item.name,
      item.stock,
      item.unit,
      item.threshold,
      item.lowStock ? "YA" : "",
    ]);
  }
  rows.push([], ["BON PELANGGAN", "Nama", "Sisa bon", "Jumlah transaksi bon"]);
  for (const item of report.bon) {
    rows.push(["", item.name, item.unpaidTotal, item.bonCount]);
  }
  return rows.map(csvRow).join("\r\n");
}

/** CSV daftar transaksi (untuk filter yang sedang aktif di layar Transaksi). */
export function transactionsToCsv(transactions: Transaction[]): string {
  const rows: Array<Array<string | number | null>> = [
    [
      "ID Transaksi",
      "Waktu",
      "Tipe",
      "Status Bayar",
      "Pelanggan",
      "Jumlah Item",
      "Item",
      "Total",
    ],
  ];
  for (const trx of transactions) {
    rows.push([
      trx.id,
      formatDateTimeID(trx.timestamp),
      trx.paymentType,
      trx.paymentStatus,
      trx.customer?.name ?? "",
      trx.items.reduce((sum, item) => sum + item.quantity, 0),
      trx.items
        .map((item) => `${item.productName} x${item.quantity} @${item.unitPrice}`)
        .join(", "),
      trx.total,
    ]);
  }
  return rows.map(csvRow).join("\r\n");
}

// --------------------------------------------------------------------- PDF

/** PDF laporan sesuai periode yang sedang dipilih pengguna. */
export function reportToPdf(report: ReportDocument): Uint8Array {
  const lines: PdfLine[] = [];
  const heading = (text: string) =>
    lines.push({ text, size: 12, bold: true, gapBefore: 14 });
  const line = (text: string) => lines.push({ text, size: 10 });

  lines.push({ text: "LAPORAN PENJUALAN WARUNGKU", size: 16, bold: true });
  line(`Periode: ${report.rangeLabel} (mulai ${report.periodStartKey})`);
  line(`Dibuat: ${formatDateTimeID(report.generatedAt)} WIB`);

  heading("RINGKASAN");
  line(`Omzet: ${formatIDR(report.summary.omzet)}`);
  line(`Transaksi: ${report.summary.transactionCount}`);
  line(`Tunai: ${formatIDR(report.summary.cashTotal)} (${report.summary.cashCount} transaksi)`);
  line(`Bon: ${formatIDR(report.summary.bonTotal)} (${report.summary.bonCount} transaksi)`);
  if (report.summary.settlementTotal > 0) {
    line(
      `Pelunasan bon diterima: ${formatIDR(report.summary.settlementTotal)} (bukan omzet baru)`,
    );
  }

  heading("RINCIAN HARIAN");
  for (const day of report.breakdown) {
    line(`${day.key}  ${formatIDR(day.total)}  (${day.transactionCount} transaksi)`);
  }

  heading("PRODUK TERLARIS");
  if (report.topProducts.length === 0) line("Belum ada penjualan pada periode ini.");
  report.topProducts.forEach((item, index) => {
    line(`${index + 1}. ${item.name} - ${item.quantity} terjual - ${formatIDR(item.revenue)}`);
  });

  heading("PRODUK JARANG TERJUAL");
  if (report.slowProducts.length === 0) line("Tidak ada (semua produk aktif sudah laku di periode ini).");
  for (const item of report.slowProducts) {
    line(`${item.name} - ${item.quantity} terjual - sisa stok ${item.stock} ${item.unit}`);
  }

  heading("STOK (TERATAS)");
  for (const item of report.stock) {
    line(
      `${item.name} - stok ${item.stock} ${item.unit}${item.lowStock ? " - MENIPIS" : ""}`,
    );
  }

  heading("BON PELANGGAN");
  if (report.bon.length === 0) line("Tidak ada bon aktif.");
  for (const item of report.bon) {
    line(`${item.name} - sisa ${formatIDR(item.unpaidTotal)} (${item.bonCount} transaksi bon)`);
  }

  return createTextPdf("Laporan Warungku", lines);
}

// ------------------------------------------------------------- Unduhan (UI)

function triggerDownload(filename: string, blob: Blob): void {
  if (typeof document === "undefined") return; // lingkungan uji (node)
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Unduh CSV di perangkat (BOM UTF-8 agar Excel membaca dengan benar). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(filename, blob);
}

/** Unduh PDF di perangkat. */
export function downloadPdf(filename: string, bytes: Uint8Array): void {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  triggerDownload(filename, blob);
}

/** Nama berkas laporan yang stabil: laporan-warungku-2026-09-01.csv */
export function reportFilename(report: ReportDocument, ext: "csv" | "pdf"): string {
  return `laporan-warungku-${report.periodStartKey}.${ext}`;
}
