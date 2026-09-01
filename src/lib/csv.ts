import { validateBarcode } from "./barcode";

/**
 * Parser CSV produk — untuk impor master milik pengguna
 * (mis. dataset Kaggle "Indongan Product Dataset" format CSV).
 * Mendukung pemisah koma / titik-koma / tab dan nama kolom umum
 * (Indonesia & Inggris).
 */

export interface ParsedProductRow {
  barcode: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
}

export interface CsvParseResult {
  rows: ParsedProductRow[];
  /** Baris gagal dibaca (nomor baris + alasan). */
  errors: Array<{ line: number; reason: string }>;
  /** Kolom yang dikenali dari header. */
  detectedColumns: string[];
}

const COLUMN_ALIASES: Record<string, keyof ParsedProductRow> = {
  barcode: "barcode",
  kode: "barcode",
  kode_barcode: "barcode",
  ean: "barcode",
  ean13: "barcode",
  upc: "barcode",
  nama: "name",
  name: "name",
  product_name: "name",
  produk: "name",
  product: "name",
  kategori: "category",
  category: "category",
  categories: "category",
  harga: "price",
  price: "price",
  harga_jual: "price",
  selling_price: "price",
  harga_default: "price",
  default_price: "price",
  stok: "stock",
  stock: "stock",
  qty: "stock",
  quantity: "stock",
  satuan: "unit",
  unit: "unit",
};

/** Pecah satu baris CSV dengan dukungan tanda kutip ganda. */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function detectDelimiter(headerLine: string): string {
  for (const delimiter of [";", "\t", ","]) {
    if (headerLine.includes(delimiter)) return delimiter;
  }
  return ",";
}

function digits(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Batas aman per impor (mencegah UI macet & localStorage penuh). */
export const MAX_IMPORT_ROWS = 2000;

export function parseProductCsv(text: string): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const result: CsvParseResult = { rows: [], errors: [], detectedColumns: [] };
  if (lines.length === 0) return result;

  const delimiter = detectDelimiter(lines[0]);
  const headerCells = splitLine(lines[0], delimiter).map((cell) =>
    cell.toLowerCase().replace(/\s+/g, "_"),
  );

  const columnIndex: Partial<Record<keyof ParsedProductRow, number>> = {};
  headerCells.forEach((cell, index) => {
    const mapped = COLUMN_ALIASES[cell];
    if (mapped && columnIndex[mapped] === undefined) {
      columnIndex[mapped] = index;
      result.detectedColumns.push(cell);
    }
  });

  // Tanpa header dikenali → anggap baris pertama adalah data
  // dengan urutan: barcode, nama, kategori, harga, stok, satuan.
  const hasHeader = result.detectedColumns.length >= 2;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const indexOf = (key: keyof ParsedProductRow, fallback: number): number =>
    columnIndex[key] ?? (hasHeader ? -1 : fallback);

  const seenBarcodes = new Set<string>();
  dataLines.forEach((line, dataIndex) => {
    const lineNumber = dataIndex + (hasHeader ? 2 : 1);
    if (result.rows.length >= MAX_IMPORT_ROWS) return;
    const cells = splitLine(line, delimiter);

    let barcode = (cells[indexOf("barcode", 0)] ?? "").replace(/[\s\-./]/g, "");
    const name = cells[indexOf("name", 1)] ?? "";
    if (!barcode && !name) return; // baris kosong — lewati diam-diam
    if (!barcode) {
      result.errors.push({ line: lineNumber, reason: "barcode kosong" });
      return;
    }
    // §5D: normalisasi + validasi GS1 — barcode karangan/tidak valid ditolak.
    const check = validateBarcode(barcode);
    if (!check.valid) {
      result.errors.push({ line: lineNumber, reason: `barcode tidak valid (${check.reason})` });
      return;
    }
    barcode = check.normalized;
    if (!name) {
      result.errors.push({ line: lineNumber, reason: "nama produk kosong" });
      return;
    }
    if (seenBarcodes.has(barcode)) {
      result.errors.push({ line: lineNumber, reason: "barcode duplikat di dalam file" });
      return;
    }
    seenBarcodes.add(barcode);

    const price = digits(cells[indexOf("price", 3)]) ?? 0;
    const stock = digits(cells[indexOf("stock", 4)]) ?? 0;
    const unit = (cells[indexOf("unit", 5)] || "pcs").toLowerCase();

    result.rows.push({ barcode, name, category: cells[indexOf("category", 2)] || "Lainnya", price, stock, unit });
  });

  return result;
}

/** Contoh isi CSV untuk tombol "unduh contoh". */
export const CSV_TEMPLATE = `barcode,nama,kategori,harga,stok,satuan
8991002101234,Indomie Goreng 85g,Makanan Instan,3500,24,pcs
8991234567890,Teh Botol Sosro 450ml,Minuman,5000,12,pcs`;
