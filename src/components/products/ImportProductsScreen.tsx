"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { useApp } from "@/components/providers/AppProviders";
import { useCatalog } from "@/components/providers/CatalogProvider";
import {
  CSV_TEMPLATE,
  MAX_IMPORT_ROWS,
  parseProductCsv,
  type CsvParseResult,
} from "@/lib/csv";
import type { BulkImportResult } from "@/services/product.service";
import { PRODUCT_UNITS } from "@/domain";
import type { ProductUnit } from "@/domain";
import { formatIDR } from "@/lib/money";

function toUnit(value: string): ProductUnit {
  return (PRODUCT_UNITS as readonly string[]).includes(value)
    ? (value as ProductUnit)
    : "pcs";
}

/**
 * IMPOR CSV — tambah banyak produk sekaligus dari file master milik
 * sendiri (mis. dataset produk Indonesia dari Kaggle).
 * Alur: pilih file → pratinjau → IMPOR SEKARANG → laporan hasil.
 * Semua operasi offline-first: katalog lokal langsung terisi, Google
 * Sheets menyusul lewat antrean sinkronisasi.
 */
export function ImportProductsScreen() {
  const { products } = useApp();
  const { reloadLocal } = useCatalog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parse, setParse] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    setReport(null);
    if (file.size > 2 * 1024 * 1024) {
      setError("File terlalu besar (maksimal 2 MB). Pecah menjadi beberapa file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseProductCsv(String(reader.result ?? ""));
      setParse(parsed);
      setFileName(file.name);
      if (parsed.rows.length === 0 && parsed.errors.length > 0) {
        setError("Tidak ada baris valid yang terbaca. Periksa kolom barcode & nama.");
      }
    };
    reader.onerror = () => setError("Gagal membaca file. Coba lagi.");
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!parse || parse.rows.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const result = await products.bulkCreateProducts(
        parse.rows.map((row) => ({
          barcode: row.barcode,
          name: row.name,
          category: row.category,
          currentPrice: row.price,
          stock: row.stock,
          unit: toUnit(row.unit),
        })),
      );
      setReport(result);
      setParse(null);
      reloadLocal();
    } catch {
      setError("Impor gagal. Data tidak berubah — coba lagi.");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "contoh-impor-produk.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Langkah 1 — pilih file */}
      <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
        <h2 className="text-sm font-bold text-stone-900">1. Pilih file CSV</h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          Kolom yang dikenali: <span className="font-semibold">barcode</span>,{" "}
          <span className="font-semibold">nama</span>, kategori, harga, stok,
          satuan (nama kolom Indonesia atau Inggris boleh). Maksimal{" "}
          {MAX_IMPORT_ROWS.toLocaleString("id-ID")} baris per impor.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = "";
          }}
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80 disabled:opacity-50"
          >
            <Icon name="upload" className="h-5 w-5" />
            Pilih File CSV
          </button>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 active:opacity-80"
          >
            Contoh CSV
          </button>
        </div>
      </section>

      {/* Langkah 2 — pratinjau */}
      {parse && parse.rows.length > 0 ? (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
          <h2 className="text-sm font-bold text-stone-900">2. Periksa sebelum impor</h2>
          <p className="mt-1 text-xs text-stone-500">
            {fileName} — {parse.rows.length} baris valid
            {parse.errors.length > 0 ? `, ${parse.errors.length} baris bermasalah (dilewati)` : ""}
          </p>

          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl ring-1 ring-stone-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Nama</th>
                  <th className="px-2 py-2 font-semibold">Kategori</th>
                  <th className="px-2 py-2 text-right font-semibold">Harga</th>
                  <th className="px-3 py-2 text-right font-semibold">Stok</th>
                </tr>
              </thead>
              <tbody>
                {parse.rows.slice(0, 50).map((row) => (
                  <tr key={row.barcode} className="border-t border-stone-100">
                    <td className="max-w-36 truncate px-3 py-2 font-semibold text-stone-800">
                      {row.name}
                    </td>
                    <td className="max-w-24 truncate px-2 py-2 text-stone-500">{row.category}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right text-stone-700">
                      {formatIDR(row.price)}
                    </td>
                    <td className="px-3 py-2 text-right text-stone-700">{row.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parse.rows.length > 50 ? (
            <p className="mt-1 text-[11px] text-stone-400">
              … dan {parse.rows.length - 50} baris lainnya
            </p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80 disabled:opacity-50"
            >
              {importing ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Icon name="check" className="h-5 w-5" />
              )}
              {importing ? "Mengimpor…" : `Impor ${parse.rows.length} Produk`}
            </button>
            <button
              type="button"
              onClick={() => setParse(null)}
              disabled={importing}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 active:opacity-80"
            >
              Batal
            </button>
          </div>
          <p className="mt-2 text-[11px] text-stone-400">
            Barcode yang sudah ada di katalog otomatis dilewati (tidak jadi dobel).
          </p>
        </section>
      ) : null}

      {/* Langkah 3 — laporan hasil */}
      {report ? (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Icon name="check" className="h-5 w-5" />
            </span>
            <h2 className="text-sm font-bold text-stone-900">Impor selesai</h2>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li className="flex justify-between">
              <span className="text-stone-500">Berhasil ditambahkan</span>
              <span className="font-bold text-stone-900">{report.created.length}</span>
            </li>
            {report.skippedExisting.length > 0 ? (
              <li className="flex justify-between">
                <span className="text-stone-500">Dilewati (sudah ada)</span>
                <span className="font-bold text-amber-600">
                  {report.skippedExisting.length}
                </span>
              </li>
            ) : null}
            {report.failedRows.length > 0 ? (
              <li className="flex justify-between">
                <span className="text-stone-500">Gagal</span>
                <span className="font-bold text-red-600">{report.failedRows.length}</span>
              </li>
            ) : null}
          </ul>

          {report.skippedExisting.length > 0 ? (
            <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
              Sudah ada: {report.skippedExisting.slice(0, 5).map((s) => s.name).join(", ")}
              {report.skippedExisting.length > 5
                ? ` +${report.skippedExisting.length - 5} lainnya`
                : ""}
            </p>
          ) : null}

          <Link
            href="/produk"
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80"
          >
            Lihat Daftar Produk
          </Link>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
