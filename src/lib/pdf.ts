/**
 * PENULIS PDF MINIMAL (§7) — teks saja, TANPA dependensi eksternal dan
 * TANPA server: seluruh berkas disusun lokal di perangkat (offline-first).
 * Cukup untuk laporan teks berbaris (judul, angka, tabel sederhana).
 *
 * Batasan yang disengaja: font dasar Helvetica (WinAnsi/latin-1), teks
 * rata kiri, tanpa gambar. Laporan bisnis warung tidak butuh lebih.
 */

export interface PdfLine {
  text: string;
  /** Ukuran font pt (default 10). */
  size?: number;
  bold?: boolean;
  /** Jarak ekstra sebelum baris (pt). */
  gapBefore?: number;
}

const PAGE_WIDTH = 595.28; // A4 pt
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const TOP_Y = PAGE_HEIGHT - 56;
const BOTTOM_Y = 56;

/** Karakter di luar latin-1 diganti aman (tetap terbaca, tanpa error). */
function toLatin1(text: string): string {
  const replacements: Record<string, string> = {
    "—": "-",
    "–": "-",
    "…": "...",
    "’": "'",
    "‘": "'",
    "“": '"',
    "”": '"',
    "×": "x",
    "≤": "<=",
    "·": "-",
    "\u00a0": " ",
  };
  let out = "";
  for (const char of text) {
    if (replacements[char]) {
      out += replacements[char]!;
    } else if (char.charCodeAt(0) <= 255) {
      out += char;
    } else {
      out += "?";
    }
  }
  return out;
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Susun berkas PDF dari baris-baris teks → Uint8Array siap unduh. */
export function createTextPdf(title: string, lines: PdfLine[]): Uint8Array {
  // Bagi baris ke halaman.
  const pages: PdfLine[][] = [[]];
  let y = TOP_Y;
  for (const line of lines) {
    const size = line.size ?? 10;
    const height = size * 1.5 + (line.gapBefore ?? 0);
    if (y - height < BOTTOM_Y && pages[pages.length - 1]!.length > 0) {
      pages.push([]);
      y = TOP_Y;
    }
    pages[pages.length - 1]!.push(line);
    y -= height;
  }

  // Susun objek PDF.
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const firstPageObject = 5; // 1 katalog, 2 pages, 3 font reg, 4 font bold
  for (let i = 0; i < pages.length; i += 1) {
    pageObjectIds.push(firstPageObject + i * 2);
  }

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] /Count ${pages.length} >>`;
  objects[3] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  pages.forEach((pageLines, index) => {
    const contentId = firstPageObject + index * 2 + 1;
    let stream = "";
    let cursorY = TOP_Y;
    for (const line of pageLines) {
      const size = line.size ?? 10;
      cursorY -= size * 1.5 + (line.gapBefore ?? 0);
      const font = line.bold ? "/F2" : "/F1";
      const text = escapePdfText(toLatin1(line.text));
      stream += `BT ${font} ${size} Tf 1 0 0 1 ${MARGIN_X.toFixed(2)} ${cursorY.toFixed(2)} Tm (${text}) Tj ET\n`;
    }
    objects[pageObjectIds[index]!] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(
        2,
      )}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = {
      toString: () =>
        `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    } as unknown as string;
    // Simpan stream mentah agar panjang dihitung dari byte latin-1.
    (objects[contentId] as unknown as { raw: string }).raw = stream;
  });

  // Rakit berkas + tabel xref dengan offset byte (latin-1 = 1 byte/karakter).
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id += 1) {
    const object = objects[id] as unknown as { raw?: string } | string;
    offsets[id] = pdf.length;
    if (typeof object === "object" && object !== null && "raw" in object) {
      const header = `<< /Length ${object.raw!.length} >>\nstream\n`;
      pdf += `${id} 0 obj\n${header}${object.raw}endstream\nendobj\n`;
    } else {
      pdf += `${id} 0 obj\n${object as string}\nendobj\n`;
    }
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  // Seluruh konten sudah latin-1 (1 karakter = 1 byte).
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }
  void title;
  return bytes;
}
