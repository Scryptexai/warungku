/**
 * GENERATOR KATALOG MASTER OFFLINE.
 *
 * Menggabungkan tiga sumber menjadi `src/data/master/master-offline-catalog.ts`:
 *  1. Katalog kurasi ekstra (CSV per kategori, nama+harga produk warung nyata;
 *     barcode = EAN-13 template valid, digenerate deterministik).
 *  2. Produk Open Food Facts Indonesia (CSV code,nama — barcode NYATA,
 *     diambil dari API publik OFF; harga = perkiraan berdasar kategori/ukuran).
 *  3. Seed inti 99 produk tetap di master-products.ts (tidak disentuh).
 *
 * Jalankan: node scripts/generate-master-catalog.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT, "scripts", "data");
const OUT = path.join(ROOT, "src", "data", "master", "master-offline-catalog.ts");

// Prefix 12-digit per kategori untuk barcode template (digit-cek dihitung).
const PREFIX = {
  makanan: "8991003100",
  minuman: "8991004100",
  snack: "8991005100",
  rokok: "8991006100",
  bahan: "8991007100",
  rumah: "8991008100",
};
const CATEGORY_FILES = [
  ["makanan", "Makanan Instan"],
  ["minuman", "Minuman"],
  ["snack", "Snack"],
  ["rokok", "Rokok"],
  ["bahan", "Bahan Masak"],
  ["rumah", "Kebutuhan Rumah"],
];

function ean13CheckDigit(base12) {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const digit = Number(base12[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

function roundHundreds(value) {
  return Math.max(0, Math.round(value / 100) * 100);
}

function readCurated() {
  const rows = [];
  for (const [slug, category] of CATEGORY_FILES) {
    const file = path.join(DATA_DIR, `curated-extra-${slug}.csv`);
    if (!fs.existsSync(file)) continue;
    let counter = 1;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [name, price, unit] = trimmed.split(",").map((c) => c.trim());
      if (!name || !price) continue;
      const base = `${PREFIX[slug]}${String(counter).padStart(3, "0")}`;
      counter += 1;
      rows.push({
        barcode: `${base}${ean13CheckDigit(base)}`,
        name,
        category,
        suggestedPrice: Number(price),
        unit: unit || "pcs",
        source: "curated",
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------- OFF CSV
const OFF_RULES = [
  ["Rokok", /rokok|sampoerna|gudang garam|djarum|marlboro|good day|class mild|x mild|magnum|dunhill|sam soe|surya\b|shinten|juara 12|la bold/i],
  ["Minuman", /teh|tea|aqua|air mineral|water|susu|milk|juice|jus|kopi|coffee|cola|fanta|sprite|drink|pocari|mizone|iso ?plus|ion supply|buavita|floridina|nutrisari|adem sari|nescafe|cappuc|cappuccino|hydro|sirup|marjan|ostea|ich?i ocha|frestea|milku|sarang|madu|sirih|aquviva|cleo|le minerale|minerale|milo|yogurt|yoghurt|yog\b|frisian|fisian|skm|greensand|pristine|you c1000|oat m|collagena|larutan|penyegar|hemaviton|c1000|npl\b|full cream|bear brand|indomilk|greenfields|ultra/i],
  ["Bahan Masak", /saos|sausage?|kecap|sambal|bumbu|gula|tepung|minyak|margarin|mentega|santan|sasa\b|masako|royco|racik|kaldu|garam|micin|vetsin|spaghetti|pasta|oatmeal|oats\b|quaker|kefir|cider|bunga|lawang|merica|lada|bbq|saus|cabai|cabe|boncabe/i],
  ["Kebutuhan Rumah", /sabun|shampo|sampo|pasta gigi|odol|deterjen|rinso|daia|sunlight|baygon|tissue|kapas|parfum|pewangi|molto|wipol|karbol/i],
  ["Makanan Instan", /indomie|mi goreng|mie sedaap|sedoa?ap|sarimi|supermi|pop mie|mi sedaap|sedaap|ramen|gaga|bakmi|sarden|corned|kornet|energen|bubur instan|lemontilo|lemonilo/i],
  ["Snack", /wafer|chips|chitato|cheetos|qtela|lays|oreo|biskuat|roma\b|tango|nabati|beng-?beng|choki|silverqueen|cadbury|permen|candy|gummy|yupi|kis\b|relaxa|kopiko|malkist|saluut|salcheese|biskuit|biscuit|cookies|kacang|pilus|atom\b|keripik|crackers|crisp|potato|sari gandum|superco|gimbori|cokelat|choc|chic|deo\b|snack|roti|bread|smax|cheese|pie\b|slices|ceres/i],
];

function classifyOff(name) {
  for (const [category, rx] of OFF_RULES) {
    if (rx.test(name)) return category;
  }
  return "Lainnya";
}

const PRICE_BASE = {
  Minuman: 4500,
  Snack: 2500,
  "Makanan Instan": 3500,
  Rokok: 30000,
  "Bahan Masak": 9000,
  "Kebutuhan Rumah": 10000,
  Lainnya: 5000,
};

/** Perkiraan harga dari kategori + petunjuk ukuran pada nama produk. */
function estimatePrice(name, category) {
  let factor = 1;
  const vol = name.match(/(\d+(?:[.,]\d+)?)\s*(ml|l\b|liter)/i);
  const wgt = name.match(/(\d+(?:[.,]\d+)?)\s*(g\b|gr|gram|kg)/i);
  if (vol) {
    const ml = vol[2].toLowerCase().startsWith("l") ? Number(vol[1].replace(",", ".")) * 1000 : Number(vol[1]);
    if (ml >= 1000) factor = 2.6;
    else if (ml >= 600) factor = 1.8;
    else if (ml < 260) factor = 0.8;
  } else if (wgt) {
    const g = wgt[2].toLowerCase() === "kg" ? Number(wgt[1].replace(",", ".")) * 1000 : Number(wgt[1]);
    if (g >= 500) factor = 2.6;
    else if (g >= 150) factor = 1.8;
    else if (g < 45) factor = 0.8;
  }
  if (/\b(mini|kecil|sachet)\b/i.test(name)) factor = 0.7;
  return roundHundreds(PRICE_BASE[category] * factor);
}

function readOff() {
  const rows = [];
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("off-id-p") && f.endsWith(".csv"))
    .sort();
  for (const file of files) {
    for (const line of fs.readFileSync(path.join(DATA_DIR, file), "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const comma = trimmed.indexOf(",");
      if (comma === -1) continue;
      const code = trimmed.slice(0, comma).trim();
      let name = trimmed
        .slice(comma + 1)
        .trim()
        // bersihkan awalan kode rak toko ("17000725 Oreo ..." → "Oreo ...")
        .replace(/^\d{5,}\s+/, "")
        .replace(/\s{2,}/g, " ");
      if (!/^\d{13}$/.test(code)) continue;
      const GENERIC = /^(makanan|produk|minuman|snack|baru|test|sample|new item)$/i;
      const letters = name.replace(/[^a-zA-Z]/g, "");
      if (name.length < 4 || letters.length < 4 || /^\d+$/.test(name) || GENERIC.test(name)) continue;
      // buang sisa kurung tanpa pasangan di ujung
      name = name.replace(/\s*\($/, "").trim();
      const category = classifyOff(name);
      rows.push({
        barcode: code,
        name: titleCaseSafe(name),
        category,
        suggestedPrice: estimatePrice(name, category),
        unit: "pcs",
        source: "off",
      });
    }
  }
  return rows;
}

// ------------------------------------------------------------------ merge
/** Kapital awal kata, tapi jangan ubah kata bersimbol (cth. "M*lk"). */
function titleCaseSafe(name) {
  return name
    .split(" ")
    .map((word) => (/^[a-z][a-z'\-]*$/i.test(word) ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const SEEDS_FILE = path.join(ROOT, "src", "data", "master", "master-products.ts");
const seedNames = new Set(
  (fs.readFileSync(SEEDS_FILE, "utf8").match(/name:\s*"([^"]+)"/g) ?? [])
    .map((m) => normalizeName(m.slice(7, -1))),
);

const curated = readCurated();
const off = readOff();

// Kurasi menang atas OFF (nama sama), seed inti menang atas keduanya.
const seenNames = new Set(seedNames);
const seenBarcodes = new Set();
const finalRows = [];
for (const row of curated) {
  const key = normalizeName(row.name);
  if (seenNames.has(key)) continue;
  seenNames.add(key);
  seenBarcodes.add(row.barcode);
  finalRows.push(row);
}
for (const row of off) {
  const key = normalizeName(row.name);
  if (seenNames.has(key) || seenBarcodes.has(row.barcode)) continue;
  seenNames.add(key);
  seenBarcodes.add(row.barcode);
  finalRows.push(row);
}

finalRows.sort((a, b) =>
  a.category.localeCompare(b.category, "id") || a.name.localeCompare(b.name, "id"),
);

// ---------------------------------------------------------------- output
const bySource = { curated: 0, off: 0 };
for (const row of finalRows) bySource[row.source] += 1;

const header = `/**
 * KATALOG MASTER OFFLINE (DIGENERATE — JANGAN EDIT MANUAL).
 * Sumber & alat: scripts/generate-master-catalog.mjs + scripts/data/*.csv.
 *
 * ${finalRows.length} produk tambahan:
 * - ${bySource.curated} produk kurasi warung (barcode = template EAN-13 valid,
 *   harga rekomendasi warung 2025-an — harap disesuaikan per daerah).
 * - ${bySource.off} produk Indonesia dari Open Food Facts dengan BARCODE
 *   NYATA (scan kemasan asli dikenali); harga = PERKIRAAN dari kategori &
 *   ukuran kemasan — selalu konfirmasi sebelum dipakai.
 *
 * Seed inti (99 produk) tetap di master-products.ts. Total master gabungan:
 * ${finalRows.length + 99} produk.
 */

import type { MasterProduct } from "./master-products";

export const OFFLINE_CATALOG: MasterProduct[] = [`;

const body = finalRows
  .map(
    (row) =>
      `  { barcode: "${row.barcode}", name: ${JSON.stringify(row.name)}, category: "${row.category}", suggestedPrice: ${row.suggestedPrice}, unit: "${row.unit}" }, // ${row.source}`,
  )
  .join("\n");

fs.writeFileSync(OUT, `${header}\n${body}\n];\n`);

const perCat = {};
for (const row of finalRows) perCat[row.category] = (perCat[row.category] ?? 0) + 1;
console.log(`OK: ${finalRows.length} produk ekstra ditulis (${bySource.curated} kurasi + ${bySource.off} OFF nyata)`);
console.log("Per kategori:", JSON.stringify(perCat));
console.log(`Total master (dengan seed inti 99): ${finalRows.length + 99}`);
