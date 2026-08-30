import type { ProductUnit } from "@/domain";

/**
 * MASTER PRODUK — database produk bawaan (OFFLINE).
 *
 * Sumber:
 * - Seed internal: produk khas warung Indonesia (harga rekomendasi umum).
 * - Impor CSV milik pengguna (mis. dataset Kaggle "Indonesian Product")
 *   lewat menu Produk → Impor.
 * - Open Food Facts (online, 2+ juta produk) saat internet tersedia.
 *
 * Catatan seed: kode di bawah adalah EAN-13 VALID (check digit dihitung
 * otomatis) dengan prefiks perusahaan yang realistis, sebagai TEMPLAT AWAL.
 * Untuk katalog warung Anda yang sebenarnya, impor CSV produk asli atau
 *andalkan pencarian online Open Food Facts yang mencocokkan barcode nyata.
 */

export interface MasterProduct {
  barcode: string;
  name: string;
  category: string;
  /** Harga rekomendasi (Rp) — bisa diubah saat produk ditambahkan. */
  suggestedPrice: number;
  unit: ProductUnit;
}

interface MasterSeed {
  /** 12 digit pertama EAN-13 (check digit dihitung otomatis). */
  base: string;
  name: string;
  category: string;
  price: number;
  unit?: ProductUnit;
}

/** Kategori master yang tersedia (untuk pilih massal per kategori). */
export const MASTER_CATEGORIES = [
  "Makanan Instan",
  "Minuman",
  "Snack",
  "Rokok",
  "Bahan Masak",
  "Kebutuhan Rumah",
] as const;

const SEEDS: MasterSeed[] = [
  // ------------------------------------------------ Makanan Instan (Indofood)
  { base: "8991002101001", name: "Indomie Goreng 85g", category: "Makanan Instan", price: 3500 },
  { base: "8991002101018", name: "Indomie Kari Ayam 69g", category: "Makanan Instan", price: 3500 },
  { base: "8991002101025", name: "Indomie Ayam Bawang 69g", category: "Makanan Instan", price: 3500 },
  { base: "8991002101032", name: "Indomie Ayam Spesial 70g", category: "Makanan Instan", price: 3500 },
  { base: "8991002101049", name: "Supermi Ayam Bawang 65g", category: "Makanan Instan", price: 3000 },
  { base: "8991002101056", name: "Pop Mie Ayam Bawang 75g", category: "Makanan Instan", price: 4500 },
  { base: "8991002101063", name: "Sarimi Isi 2 Ayam Bawang", category: "Makanan Instan", price: 6000 },
  { base: "8991002101070", name: "Indomie Mi Goreng Double 133g", category: "Makanan Instan", price: 7000 },
  { base: "8991002101087", name: "Anak Mas Ayam Bawang 55g", category: "Makanan Instan", price: 2600 },
  { base: "8991002101094", name: "Indomie Kari Spesial 86g", category: "Makanan Instan", price: 4200 },
  // ------------------------------------------------ Makanan Instan (Wings)
  { base: "8992388101018", name: "Mie Sedaap Goreng 91g", category: "Makanan Instan", price: 3300 },
  { base: "8992388101025", name: "Mie Sedaap Soto Mie 83g", category: "Makanan Instan", price: 3200 },
  { base: "8992388101032", name: "Mie Sedaap Koplok 92g", category: "Makanan Instan", price: 3600 },
  { base: "8992388101049", name: "Mie Sedaap Bowl Ayam Bawang", category: "Makanan Instan", price: 8500 },
  { base: "8992388101056", name: "Sedaap Cup Soto Lamongan", category: "Makanan Instan", price: 9000 },
  // ------------------------------------------------ Makanan Instan lain
  { base: "8996001601010", name: "Supermi Ayam Spesial", category: "Makanan Instan", price: 3100 },
  { base: "8992775111015", name: "Bakmi Mewah Goreng 83g", category: "Makanan Instan", price: 3200 },
  { base: "8992222101012", name: "Bihun Jagung Sasa 100g", category: "Makanan Instan", price: 4500 },
  // ------------------------------------------------ Minuman (Danone/Aqua)
  { base: "8886008101019", name: "Aqua Botol 600ml", category: "Minuman", price: 4000 },
  { base: "8886008101026", name: "Aqua Botol 1500ml", category: "Minuman", price: 7000 },
  { base: "8886008101033", name: "Aqua Gelas 240ml", category: "Minuman", price: 1000 },
  { base: "8886008101040", name: "Vit Le Minerale 600ml", category: "Minuman", price: 4000 },
  { base: "8886008101057", name: "Aqua Galon 19L (isi)", category: "Minuman", price: 21000 },
  // ------------------------------------------------ Minuman (Mayora/ lain)
  { base: "8993175531019", name: "Teh Pucuk Harum 350ml", category: "Minuman", price: 4000 },
  { base: "8993175531026", name: "Teh Pucuk Harum 500ml", category: "Minuman", price: 5000 },
  { base: "8993175531033", name: "Kopiko Blister Isi 5", category: "Minuman", price: 5000 },
  { base: "8993175531040", name: "Kopiko Sachet", category: "Minuman", price: 1000 },
  { base: "8993175531057", name: "Le Minerale Sachet 220ml", category: "Minuman", price: 1500 },
  { base: "8991009091012", name: "Teh Botol Sosro 450ml", category: "Minuman", price: 5000 },
  { base: "8991009091029", name: "Teh Botol Kotak 250ml", category: "Minuman", price: 3500 },
  { base: "5449000001019", name: "Coca-Cola Kaleng 300ml", category: "Minuman", price: 7000 },
  { base: "5449000001026", name: "Coca-Cola Botol 390ml", category: "Minuman", price: 6500 },
  { base: "5449000001033", name: "Fanta Orange 390ml", category: "Minuman", price: 6000 },
  { base: "5449000001040", name: "Sprite 390ml", category: "Minuman", price: 6000 },
  { base: "8992388102015", name: "Ultra Milk Full Cream 250ml", category: "Minuman", price: 6000 },
  { base: "8992388102022", name: "Ultra Milk Cokelat 250ml", category: "Minuman", price: 6000 },
  { base: "8996001602017", name: "Fruit Tea Apel 350ml", category: "Minuman", price: 5000 },
  { base: "8992745201011", name: "Pocari Sweat 500ml", category: "Minuman", price: 8000 },
  { base: "8992225101016", name: "Frutang Jeruk 350ml", category: "Minuman", price: 4000 },
  { base: "8991388101014", name: "Kopi Kapal Api Sachet 10g", category: "Minuman", price: 2000 },
  { base: "8991388101021", name: "Kopi Kapal Api Special Mix", category: "Minuman", price: 2500 },
  { base: "8991111111019", name: "Indocafe Kopi Sachet", category: "Minuman", price: 1500 },
  { base: "8998009011015", name: "Milo Activ-Go 30g", category: "Minuman", price: 3500 },
  // ------------------------------------------------ Snack
  { base: "8991002104012", name: "Chitato Sapi Panggang 68g", category: "Snack", price: 9000 },
  { base: "8991002104029", name: "Chitato Keju 68g", category: "Snack", price: 9000 },
  { base: "8992388103012", name: "Romeo 70g", category: "Snack", price: 8500 },
  { base: "8992388103029", name: "Qtela Balado 60g", category: "Snack", price: 8000 },
  { base: "8992388103036", name: "Cheetos Jagung Bakar 60g", category: "Snack", price: 8500 },
  { base: "8993175532016", name: "Beng Beng Wafer 20g", category: "Snack", price: 2500 },
  { base: "8993175532023", name: "Choki Choki 15g", category: "Snack", price: 2000 },
  { base: "8993175532030", name: "Roma Kelapa 130g", category: "Snack", price: 4500 },
  { base: "8993175532047", name: "Roma Malkist Cokelat 130g", category: "Snack", price: 5500 },
  { base: "8993175532054", name: "Slai O'lai Nanas 150g", category: "Snack", price: 6500 },
  { base: "8993175532061", name: "Energen Cokelat 30g", category: "Snack", price: 2500 },
  { base: "8992775112012", name: "Oreo Original 133g", category: "Snack", price: 8500 },
  { base: "8992775112029", name: "Oreo Vanilla 133g", category: "Snack", price: 8500 },
  { base: "8998009012012", name: "SilverQueen Chunky Bar 65g", category: "Snack", price: 15000 },
  { base: "8991388102011", name: "Tic Tac Freshmint 15g", category: "Snack", price: 3000 },
  { base: "8996001603014", name: "Relaxa Permen Susu 5g", category: "Snack", price: 1000 },
  { base: "8992222102019", name: "Kacang Garuda Roasted 200g", category: "Snack", price: 6000 },
  { base: "8992222102026", name: "Kacang Garuda Garing 165g", category: "Snack", price: 7000 },
  { base: "8991002104036", name: "Potabee Beef BBQ 65g", category: "Snack", price: 9000 },
  // ------------------------------------------------ Rokok
  { base: "8992696101017", name: "Sampoerna Mild 16", category: "Rokok", price: 36000 },
  { base: "8992696101024", name: "Sampoerna Mild 12", category: "Rokok", price: 28000 },
  { base: "8992696101031", name: "Sampoerna Hijau 12", category: "Rokok", price: 27000 },
  { base: "8992696101048", name: "Marlboro Merah 20", category: "Rokok", price: 34000 },
  { base: "8991389101017", name: "Gudang Garam Surya 12", category: "Rokok", price: 31000 },
  { base: "8991389101024", name: "Gudang Garam Surya 16", category: "Rokok", price: 38000 },
  { base: "8991389101031", name: "Gudang Garam Merah 12", category: "Rokok", price: 26000 },
  { base: "8996001604011", name: "Dji Sam Soe 12", category: "Rokok", price: 30000 },
  { base: "8992775113019", name: "Camel Merah 20", category: "Rokok", price: 32000 },
  // ------------------------------------------------ Bahan Masak
  { base: "8991002105019", name: "Gula Pasir Gulaku 1kg", category: "Bahan Masak", price: 18000, unit: "kg" },
  { base: "8991002105026", name: "Gula Pasir Premium 1/2kg", category: "Bahan Masak", price: 9500, unit: "kg" },
  { base: "8991002105033", name: "Minyak Goreng Bimoli 1L", category: "Bahan Masak", price: 18000, unit: "liter" },
  { base: "8991002105040", name: "Minyak Goreng Bimoli 2L", category: "Bahan Masak", price: 35000, unit: "liter" },
  { base: "8991002105057", name: "Minyak Goreng Sania 2L", category: "Bahan Masak", price: 33000, unit: "liter" },
  { base: "8991002105064", name: "Tepung Serbaguna Segitiga Biru 1kg", category: "Bahan Masak", price: 13000, unit: "kg" },
  { base: "8991002105071", name: "Beras Ramos Premium 5kg", category: "Bahan Masak", price: 68000, unit: "kg" },
  { base: "8991002105088", name: "Garam Beryodium 500g", category: "Bahan Masak", price: 5000, unit: "gram" },
  { base: "8991002105095", name: "Kecap Manis ABC 200ml", category: "Bahan Masak", price: 9500, unit: "ml" },
  { base: "8991002105101", name: "Saus Sambal ABC 135ml", category: "Bahan Masak", price: 7000, unit: "ml" },
  { base: "8991002105118", name: "Sarden ABC 155g", category: "Bahan Masak", price: 9500 },
  { base: "8991002105125", name: "Royco Kaldu Ayam 60g", category: "Bahan Masak", price: 4500 },
  { base: "8991002105132", name: "Royco Kaldu Sapi 60g", category: "Bahan Masak", price: 4500 },
  { base: "8991002105149", name: "Margarina Blue Band 250g", category: "Bahan Masak", price: 8500 },
  { base: "8992388104019", name: "Sabun Colek Mie Sedaap Lidi", category: "Bahan Masak", price: 3000 },
  // ------------------------------------------------ Kebutuhan Rumah
  { base: "8999999041016", name: "Sunlight Jeruk Nipis 755ml", category: "Kebutuhan Rumah", price: 13000, unit: "ml" },
  { base: "8999999041023", name: "Sunlight Sachet 20ml", category: "Kebutuhan Rumah", price: 1500, unit: "ml" },
  { base: "8999999041030", name: "Rinso Anti Noda 770g", category: "Kebutuhan Rumah", price: 16000, unit: "gram" },
  { base: "8999999041047", name: "Rinso Sachet 72g", category: "Kebutuhan Rumah", price: 2000, unit: "gram" },
  { base: "8999999041054", name: "Daia Soda Bubuk 800g", category: "Kebutuhan Rumah", price: 12000, unit: "gram" },
  { base: "8999999041061", name: "Sabun Lifebuoy 110ml", category: "Kebutuhan Rumah", price: 4500, unit: "ml" },
  { base: "8999999041078", name: "Pepsodent Pasta Gigi 190g", category: "Kebutuhan Rumah", price: 9000, unit: "gram" },
  { base: "8999999041085", name: "Clear Shampo Sachet 12ml", category: "Kebutuhan Rumah", price: 1000, unit: "ml" },
  { base: "8999999041092", name: "Tissue Paseo 250 sheet", category: "Kebutuhan Rumah", price: 11000 },
  { base: "8999999041108", name: "Baygon Aerosol 400ml", category: "Kebutuhan Rumah", price: 14000, unit: "ml" },
  { base: "8999999041115", name: "Korek Api Gas (isi 5)", category: "Kebutuhan Rumah", price: 2500 },
  { base: "8999999041122", name: "Baterai ABC AA (isi 2)", category: "Kebutuhan Rumah", price: 6000 },
  { base: "8999999041139", name: "Sikat Gigi Pepsodent", category: "Kebutuhan Rumah", price: 8000 },
];

/** Hitung check digit EAN-13 dari 12 digit pertama. */
function ean13CheckDigit(base12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const digit = Number(base12[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

function buildMaster(): MasterProduct[] {
  return SEEDS.map((seed) => ({
    barcode: `${seed.base}${ean13CheckDigit(seed.base)}`,
    name: seed.name,
    category: seed.category,
    suggestedPrice: seed.price,
    unit: seed.unit ?? "pcs",
  }));
}

/** Seluruh master produk (sudah dengan check digit EAN-13 valid). */
export const MASTER_PRODUCTS: MasterProduct[] = buildMaster();

const MASTER_BY_BARCODE = new Map<string, MasterProduct>(
  MASTER_PRODUCTS.map((item) => [item.barcode, item]),
);

/** Cari produk master berdasar barcode (OFFLINE, instan). */
export function findMasterByBarcode(barcode: string): MasterProduct | null {
  return MASTER_BY_BARCODE.get(barcode.trim()) ?? null;
}
