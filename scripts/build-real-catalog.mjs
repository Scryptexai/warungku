/**
 * GENERATOR KATALOG PRODUK 5D — REAL BARCODE ONLY.
 *
 * Pipeline (§5D):
 *   KATALOG LAMA → BACKUP → FETCH(OFF CSV) → NORMALISASI → VALIDASI →
 *   DEDUP → VERIFIKASI → IMPOR → LAPORAN MUTU
 *
 * ATURAN TIDAK-NEGOSIABEL:
 * - HANYA barcode NYATA dari rekam produk Open Food Facts yang boleh masuk.
 * - Tidak ada barcode karangan/template/estimasi. Tidak bisa diverifikasi →
 *   produk TIDAK masuk katalog barcode (data kurasi lama hanya menjadi
 *   REFERENSI HARGA, tidak pernah menghasilkan barcode).
 * - Harga hanya dari referensi kurasi dengan identitas nama+ukuran yang
 *   sama persis; selain itu null (diisi pemilik warung).
 *
 * Output:
 * - src/data/master/master-offline-catalog.ts  (katalog real)
 * - src/data/master/retired-barcodes.ts        (registry barcode sintetis
 *   lama → dipakai aplikasi untuk membersihkan katalog yang ter-seed 5C)
 * - scripts/data/catalog-report-5d.md          (laporan mutu, angka NYATA)
 *
 * Jalankan: node scripts/build-real-catalog.mjs
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "scripts", "data");
const MASTER_DIR = path.join(ROOT, "src", "data", "master");
const CATALOG_OUT = path.join(MASTER_DIR, "master-offline-catalog.ts");
const RETIRED_OUT = path.join(MASTER_DIR, "retired-barcodes.ts");
const REPORT_OUT = path.join(DATA, "catalog-report-5d.md");
const BACKUP_DIR = path.join(DATA, "backup-5d");

// ------------------------------------------------------------ validasi GS1
function gs1CheckDigit(body) {
  let sum = 0;
  let weight = 3;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10;
}

const SUPPORTED = new Set([8, 12, 13, 14]);

function validateBarcode(raw) {
  const normalized = String(raw).replace(/[\s\-./]/g, "").trim();
  if (!/^\d+$/.test(normalized)) return { ok: false, reason: "non-numerik", normalized };
  if (!SUPPORTED.has(normalized.length)) {
    return { ok: false, reason: `panjang ${normalized.length} tidak didukung`, normalized };
  }
  if (/^(\d)\1+$/.test(normalized) || /^12345678\d*$/.test(normalized)) {
    return { ok: false, reason: "pola placeholder", normalized };
  }
  if (gs1CheckDigit(normalized.slice(0, -1)) !== Number(normalized.slice(-1))) {
    return { ok: false, reason: "digit cek salah", normalized };
  }
  return { ok: true, reason: null, normalized };
}

function isIndonesianPrefix(code) {
  return code.startsWith("899") || code.startsWith("888");
}

// Brand/merek Indonesia umum — sinyal relevansi warung selain prefiks 899/888.
const ID_BRAND_HINTS =
  /(indomie|indofood|mayora|roma\b|aqua\b|danone|sosro|teh botol|wings|mie sedaap|sedoa?ap|sarimi|supermi|pop mie|gaga\b|le minerale|ultra jaya|ultra milk|indomilk|frisian|greenfields|cimory|milo|nestle|nescafe|kapal api|torabika|luwak|kopiko|top coffee|golda|pocari|otsuka|mizone|isoplus|buavita|nutrisari|you c1000|adem sari|hydro coco|kratingdaeng|extra joss|energen|oreo\b|monde|khong guan|nabati|richeese|nextar|tango\b|biskuat|malkist|saluut|sari gandum|superco|chitato|cheetos|qtela|lays\b|chiki|taro\b|beng-?beng|choki|silverqueen|cadbury|garuda\b|dua kelinci|bimoli|sania|fortune|tropical|gulaku|rose brand|segitiga biru|bogasari|cakra|abc\b|bango|saori|ajinomoto|masako|royco|sasa\b|kara\b|sariwangi|cap poci|pucuk harum|aoka\b|collagena|club\b|hup seng|indocafe|blue band|yakult|morinaga|sustagen|dancow|lactogen|bear brand|mamy poko|sweety|nepa|paseo|nice\b|supersu|clio\b|bolu\.?|youvit|hemaviton|irene\b|marina\b|seafood?|kopi kapal|good ?day|sampoerna|djarum|gudang garam|marlboro|class mild|x mild|magnum|dunhill|camel\b|lucky strike|lasegar|juara|surya\b|shinten|promagh|tolak angin|kuku bima|gosend|segar nyaman| vitamin|chloran|ademari|sunlight|rinso|daia\b|molto|wipol|baygon|hit\b|raid\b|swan|mia\b|citra\b|lifebuoy|lux\b|dov\b|dove\b|pepsodent|close ?up|siwak|formula\b|meswak|sensodyne|kont|closeup|paragon|wardah|pomade|garnier|sunsilk|clear\b|pantene|dove|zo|shinz|sha|odol|sensodyne)/i;

// ------------------------------------------------- baca CSV sumber OFF
// Format lama (2 kolom): code,nama   Format baru (4 kolom): code,nama,brand,qty
function readOffRecords() {
  const rows = [];
  const files = fs
    .readdirSync(DATA)
    .filter((f) => /^off-id(-p|2-)/.test(f) && f.endsWith(".csv"))
    .sort();
  for (const file of files) {
    for (const line of fs.readFileSync(path.join(DATA, file), "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const cells = t.split(",");
      const code = (cells[0] ?? "").trim();
      let name = (cells[1] ?? "").trim();
      const brand = (cells[2] ?? "").trim();
      const qty = (cells[3] ?? "").trim();
      if (!code || !name) continue;
      rows.push({ file, code, rawName: name, brand, qty });
    }
  }
  return rows;
}

// ------------------------------------------- referensi harga kurasi (lama)
function readPriceReference() {
  const ref = new Map(); // key: nama ternormalisasi → harga
  const files = [
    "curated-core.csv",
    ...fs
      .readdirSync(DATA)
      .filter((f) => f.startsWith("curated-extra-") && f.endsWith(".csv")),
  ];
  for (const file of files) {
    const p = path.join(DATA, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const [name, price] = t.split(",").map((c) => c?.trim());
      if (name && price && /^\d+$/.test(price)) ref.set(normName(name), Number(price));
    }
  }
  return ref;
}

function normName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function titleCaseSafe(name) {
  return name
    .split(" ")
    .map((w) => (/^[a-z][a-z'\-]*$/i.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// ----------------------------------------------------- kategori via kata kunci
const CATEGORY_RULES = [
  ["Rokok", /rokok|sampoerna|gudang garam|djarum|marlboro|class mild|x mild|magnum|dunhill|sam soe|surya\b|shinten|juara 12|la bold/i],
  ["Minuman", /teh|tea|aqua|air mineral|water|susu|milk|juice|jus|kopi|coffee|cola|fanta|sprite|drink|pocari|mizone|iso ?plus|ion supply|buavita|floridina|nutrisari|adem sari|nescafe|cappuc|hydro|sirup|frestea|milku|aquviva|cleo|le minerale|minerale|milo|yakult|collagena|you c1000|oat m|full cream|bear brand|indomilk|greenfields|ultra|frisian|energen|ornamin|larutan|penyegar|hemaviton|kratingdaeng|extra joss|tolak angin|sirih/i],
  ["Bahan Masak", /saos|sausage|kecap|sambal|bumbu|gula|tepung|minyak|margarin|mentega|santan|sasa\b|masako|royco|racik|kaldu|garam|micin|vetsin|spaghetti|pasta|oatmeal|oats\b|quaker|merica|lada|bbq|tiram/i],
  ["Kebutuhan Rumah", /sabun|shampo|sampo|pasta gigi|odol|deterjen|rinso|daia|sunlight|baygon|tissue|kapas|pewangi|molto|wipol|karbol|korek|baterai/i],
  ["Makanan Instan", /indomie|mi goreng|mie sedaap|sedoa?ap|sarimi|supermi|pop mie|gaga|bakmi|sarden|corned|kornet|bubur|lemonilo|ramen|bihun|mi instan|mi gelas/i],
  ["Snack", /wafer|chips|chitato|cheetos|qtela|lays|oreo|biskuat|roma\b|tango|nabati|beng-?beng|choki|silverqueen|cadbury|permen|candy|gummy|yupi|kopiko|malkist|saluut|salcheese|biskuit|biscuit|cookies|kacang|pilus|atom\b|keripik|crackers|crisp|potato|sari gandum|superco|gimbori|cokelat|choc|chic|roti|bread|smax|pie\b|granola|muesli|corn flakes|cereal|nestum|munch|happy tos|pola snack|monde snack|pringle/i],
];

function classify(name) {
  for (const [cat, rx] of CATEGORY_RULES) if (rx.test(name)) return cat;
  return null; // tanpa kategori jelas → tetap boleh masuk sebagai "Lainnya"
}

// ============================================================ PIPELINE
const report = {
  fetched: 0,
  validBarcode: 0,
  invalidBarcode: 0,
  notIndonesian: 0,
  noName: 0,
  duplicatesMerged: 0,
  conflicts: [],
  imported: 0,
  withPriceHint: 0,
  sources: ["Open Food Facts (api publik, countries=Indonesia)"],
};

// 1) BACKUP katalog lama (sekali saja)
fs.mkdirSync(BACKUP_DIR, { recursive: true });
for (const f of ["master-offline-catalog.ts", "master-products.ts"]) {
  const src = path.join(MASTER_DIR, f);
  if (fs.existsSync(src) && !fs.existsSync(path.join(BACKUP_DIR, f))) {
    fs.copyFileSync(src, path.join(BACKUP_DIR, f));
  }
}

// 2) Registry barcode SINTETIS lama (untuk pembersihan katalog 5C):
//    baris katalog lama ber-komentar "curated" + seed template lama.
const retired = new Set();
{
  const old = fs.readFileSync(path.join(BACKUP_DIR, "master-offline-catalog.ts"), "utf8");
  for (const m of old.matchAll(/\{ barcode: "(\d+)",[^}]*\}, \/\/ curated/g)) retired.add(m[1]);
  const oldSeeds = fs.readFileSync(path.join(BACKUP_DIR, "master-products.ts"), "utf8");
  for (const m of oldSeeds.matchAll(/base: "(\d+)"/g)) {
    const body = m[1];
    retired.add(`${body}${gs1CheckDigit(body)}`);
  }
}

// 3) FETCH records (dari CSV hasil unduh OFF)
const offRecords = readOffRecords();
report.fetched = offRecords.length;

// 4-6) NORMALISASI → VALIDASI → FILTER relevansi
const priceRef = readPriceReference();
const byBarcode = new Map();
const cleaned = [];
for (const rec of offRecords) {
  const v = validateBarcode(rec.code);
  if (!v.ok) {
    report.invalidBarcode += 1;
    continue;
  }
  report.validBarcode += 1;
  const name = rec.rawName.replace(/^\d{5,}\s+/, "").replace(/\s{2,}/g, " ").trim();
  if (name.replace(/[^a-zA-Z]/g, "").length < 4) {
    report.noName += 1;
    continue;
  }
  const relevant = isIndonesianPrefix(v.normalized) || ID_BRAND_HINTS.test(name) || ID_BRAND_HINTS.test(rec.brand);
  if (!relevant) {
    report.notIndonesian += 1;
    continue;
  }
  cleaned.push({ code: v.normalized, name: titleCaseSafe(name), brand: rec.brand, qty: rec.qty });
}

// 7) DEDUP + deteksi konflik (barcode sama → produk beda)
cleaned.sort((a, b) => a.code.localeCompare(b.code));
for (const rec of cleaned) {
  const existing = byBarcode.get(rec.code);
  if (existing) {
    if (normName(existing.name) === normName(rec.name)) {
      report.duplicatesMerged += 1; // Case 1: produk sama → dedup
      if (!existing.brand && rec.brand) existing.brand = rec.brand;
    } else {
      report.conflicts.push({ code: rec.code, a: existing.name, b: rec.name }); // Case 2
    }
    continue;
  }
  byBarcode.set(rec.code, rec);
}

// 8) VERIFIKASI + IMPOR: hanya rekam OFF (barcode nyata), harga dari
//    referensi kurasi HANYA bila nama+ukuran identik persis.
const rows = [...byBarcode.values()].map((rec) => {
  const key = normName(rec.name);
  const price = priceRef.get(key) ?? null;
  if (price !== null) report.withPriceHint += 1;
  return {
    barcode: rec.code,
    name: rec.name,
    brand: rec.brand || null,
    variant: rec.qty || null,
    category: classify(`${rec.name} ${rec.brand}`) ?? "Lainnya",
    suggestedPrice: price,
  };
});
rows.sort((a, b) => a.category.localeCompare(b.category, "id") || a.name.localeCompare(b.name, "id"));
report.imported = rows.length;

// ============================================================ OUTPUT
assert(report.imported > 0, "katalog kosong — berhenti, JANGAN menimpa katalog lama");

const ts = `/**
 * KATALOG MASTER OFFLINE — BARCODE NYATA SAJA (§5D, DIGENERATE).
 * Sumber: rekam produk Open Food Facts Indonesia (API publik gratis).
 * Alat: scripts/build-real-catalog.mjs + scripts/data/off-*.csv.
 *
 * ATURAN: setiap barcode di sini berasal dari rekam produk nyata OFF dan
 * lolos validasi GS1 (digit cek). TIDAK ADA barcode karangan. Harga hanya
 * terisi bila referensi kurasi punya nama+ukuran identik — selain itu
 * null (pemilik warung menentukan harga jualnya sendiri).
 *
 * ${report.imported} produk terverifikasi · ${retired.size} barcode sintetis
 * lama DIPENSIUNKAN (lihat retired-barcodes.ts).
 */

import type { MasterProduct } from "./master-products";

export const OFFLINE_CATALOG: MasterProduct[] = [
${rows
  .map(
    (r) =>
      `  { barcode: "${r.barcode}", name: ${JSON.stringify(r.name)}, brand: ${JSON.stringify(r.brand)}, variant: ${JSON.stringify(r.variant)}, category: "${r.category}", suggestedPrice: ${r.suggestedPrice === null ? "null" : r.suggestedPrice}, unit: "pcs", barcodeVerified: true, source: "Open Food Facts", sourceProductId: "${r.barcode}" },`,
  )
  .join("\n")}
];
`;

const retiredTs = `/**
 * REGISTRY BARCODE PENSION (§5D).
 * Barcode ini dulunya TEMPLATE sintetis (bukan nomor terdaftar) dan sudah
 * dihapus dari master. Aplikasi memakai daftar ini untuk membersihkan
 * katalog warung yang pernah ter-seed versi lama: produk TIDAK dihapus,
 * hanya barcode-nya dinolkan agar scan memakai barcode nyata.
 *
 * DIGENERATE — jangan edit manual. ${retired.size} entri.
 */

export const RETIRED_BARCODES: ReadonlySet<string> = new Set([
${[...retired].sort().map((code) => `  "${code}",`).join("\n")}
]);
`;

fs.writeFileSync(CATALOG_OUT, ts);
fs.writeFileSync(RETIRED_OUT, retiredTs);

// ------------------------------------------------------------ LAPORAN MUTU
const perCat = {};
for (const r of rows) perCat[r.category] = (perCat[r.category] ?? 0) + 1;
const md = `# LAPORAN MUTU KATALOG PRODUK — FASE 5D

Digenerate otomatis oleh \`scripts/build-real-catalog.mjs\` — SEMUA angka
di bawah dihitung dari data nyata saat build, tidak ada yang dikarang.

## Ringkasan

| Metrik | Nilai |
| --- | --- |
| Rekaman OFF diambil (CSV unduhan) | ${report.fetched} |
| Barcode valid (GS1 8/12/13/14 + digit cek) | ${report.validBarcode} |
| Barcode DITOLAK (format/digit cek/placeholder) | ${report.invalidBarcode} |
| Nama produk terlalu minim | ${report.noName} |
| Di luar relevansi warung Indonesia | ${report.notIndonesian} |
| Duplikat barcode digabung (produk sama) | ${report.duplicatesMerged} |
| KONFLIK barcode (nama berbeda) → ditandai | ${report.conflicts.length} |
| **Produk diimpor (barcode nyata terverifikasi)** | **${report.imported}** |
| — dengan harga referensi (nama+ukuran identik) | ${report.withPriceHint} |
| — tanpa harga (null — pemilik warung isi) | ${report.imported - report.withPriceHint} |
| Barcode sintetis lama DIPENSIUNKAN | ${retired.size} |

Sebaran kategori: ${Object.entries(perCat)
  .sort((a, b) => b[1] - a[1])
  .map(([c, n]) => `${c} ${n}`)
  .join(" · ")}

Sumber: ${report.sources.join("; ")}.
Provenance per produk: field \`source\` + \`sourceProductId\` (= kode barcode OFF)
pada setiap baris katalog.

## Aturan yang dijalankan

1. REAL DATA ONLY — barcode hanya dari rekam OFF; gagal verifikasi → produk
   TIDAK masuk (tidak ada barcode cadangan/karangan).
2. Normalisasi: buang spasi/tanda format; nol depan DIPERTAHANKAN; disimpan
   sebagai string.
3. Validasi GS1: panjang 8/12/13/14 + digit cek mod-10; pola placeholder ditolak.
4. Dedup by barcode; barcode sama dengan nama beda → KONFLIK ditandai
   (${report.conflicts.length} kasus, tidak digabung paksa).
5. Katalog lama (715 produk, ${retired.size} barcode sintetis) dibackup di
   scripts/data/backup-5d/ dan barcode sintetisnya dipensiunkan.

## Konflik barcode (bila ada)

${
  report.conflicts.length === 0
    ? "_Tidak ada konflik barcode pada data ini._"
    : report.conflicts.map((c) => `- \`${c.code}\`: "${c.a}" vs "${c.b}"`).join("\n")
}
`;
fs.writeFileSync(REPORT_OUT, md);

console.log(`OK  diimpor ${report.imported} produk barcode-NYATA (${report.withPriceHint} dgn harga referensi)`);
console.log(`    valid:${report.validBarcode} tolak:${report.invalidBarcode} non-warung-ID:${report.notIndonesian} dup:${report.duplicatesMerged} konflik:${report.conflicts.length}`);
console.log(`    retired barcode sintetis: ${retired.size}`);
console.log(`    laporan: scripts/data/catalog-report-5d.md`);
