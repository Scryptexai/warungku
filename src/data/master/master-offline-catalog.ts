/**
 * KATALOG MASTER OFFLINE (DIGENERATE — JANGAN EDIT MANUAL).
 * Sumber & alat: scripts/generate-master-catalog.mjs + scripts/data/*.csv.
 *
 * 616 produk tambahan:
 * - 410 produk kurasi warung (barcode = template EAN-13 valid,
 *   harga rekomendasi warung 2025-an — harap disesuaikan per daerah).
 * - 206 produk Indonesia dari Open Food Facts dengan BARCODE
 *   NYATA (scan kemasan asli dikenali); harga = PERKIRAAN dari kategori &
 *   ukuran kemasan — selalu konfirmasi sebelum dipakai.
 *
 * Seed inti (99 produk) tetap di master-products.ts. Total master gabungan:
 * 715 produk.
 */

import type { MasterProduct } from "./master-products";

export const OFFLINE_CATALOG: MasterProduct[] = [
  { barcode: "8997020180961", name: "3 In 1 Oats Vanilla", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "0711844115057", name: "ABC Kecap Asin", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "0711844130128", name: "ABC Saus Tomat 275ml", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910071000461", name: "Ajinomoto MSG 250g", category: "Bahan Masak", suggestedPrice: 6500, unit: "pcs" }, // curated
  { barcode: "89910071000471", name: "Ajinomoto MSG 500g", category: "Bahan Masak", suggestedPrice: 12000, unit: "pcs" }, // curated
  { barcode: "89910071000752", name: "Asam Jawa 100g", category: "Bahan Masak", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "8990121011073", name: "Bango Kecap Manis Botol", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910071000625", name: "Bawang Goreng 100g", category: "Bahan Masak", suggestedPrice: 15000, unit: "pcs" }, // curated
  { barcode: "89910071000635", name: "Bawang Putih Kupas 100g", category: "Bahan Masak", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910071000809", name: "Beras Medium 5kg", category: "Bahan Masak", suggestedPrice: 60000, unit: "pcs" }, // curated
  { barcode: "89910071000819", name: "Beras Pandan Wangi 5kg", category: "Bahan Masak", suggestedPrice: 75000, unit: "pcs" }, // curated
  { barcode: "89910071000829", name: "Beras Pera 5kg", category: "Bahan Masak", suggestedPrice: 58000, unit: "pcs" }, // curated
  { barcode: "89910071000792", name: "Beras Premium 5kg", category: "Bahan Masak", suggestedPrice: 68000, unit: "pcs" }, // curated
  { barcode: "89910071000869", name: "Bihun Kering 250g", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "8995899215159", name: "BonCabe Level 50 Max End", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "8995102703091", name: "Bumbu Kuah Bakso", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910071000772", name: "Bumbu Nasi Goreng Sachet 30g", category: "Bahan Masak", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "89910071000578", name: "Bumbu Racik Sate 40g", category: "Bahan Masak", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "89910071000782", name: "Bumbu Seblak Sachet 33g", category: "Bahan Masak", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "89910071000314", name: "Butter Bulat 200g", category: "Bahan Masak", suggestedPrice: 14000, unit: "pcs" }, // curated
  { barcode: "89910071000732", name: "Cengkeh 20g", category: "Bahan Masak", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "8998888712295", name: "Del Monte BBQ", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910071000655", name: "Ebi Kering 100g", category: "Bahan Masak", suggestedPrice: 12000, unit: "pcs" }, // curated
  { barcode: "89910071000685", name: "Garam Batu 1kg", category: "Bahan Masak", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910071000675", name: "Garam Kapal Beryodium 500g", category: "Bahan Masak", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910071000665", name: "Garam Refina 500g", category: "Bahan Masak", suggestedPrice: 3500, unit: "pcs" }, // curated
  { barcode: "89910071000160", name: "Gula Batu 500g", category: "Bahan Masak", suggestedPrice: 13000, unit: "pcs" }, // curated
  { barcode: "89910071000170", name: "Gula Bubuk 250g", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910071000150", name: "Gula Merah Cetak 500g", category: "Bahan Masak", suggestedPrice: 12000, unit: "pcs" }, // curated
  { barcode: "89910071000130", name: "Gula Pasir Curah 1kg", category: "Bahan Masak", suggestedPrice: 15500, unit: "pcs" }, // curated
  { barcode: "89910071000140", name: "Gula Pasir Rose Brand 1kg", category: "Bahan Masak", suggestedPrice: 17000, unit: "pcs" }, // curated
  { barcode: "0089686400816", name: "Indofood Sambal Ekstra Pedas 135ml", category: "Bahan Masak", suggestedPrice: 7200, unit: "pcs" }, // off
  { barcode: "9556174802236", name: "Instant Oatmeal", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910071000712", name: "Jinten Bubuk 50g", category: "Bahan Masak", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910071000588", name: "Kaldu Sapi Blok 10g", category: "Bahan Masak", suggestedPrice: 2000, unit: "pcs" }, // curated
  { barcode: "89910071000722", name: "Kayu Manis Batang 20g", category: "Bahan Masak", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910071000364", name: "Kecap Asin ABC 135ml", category: "Bahan Masak", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910071000374", name: "Kecap Ikan Squid Brand 150ml", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910071000324", name: "Kecap Manis ABC 135ml", category: "Bahan Masak", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910071000334", name: "Kecap Manis ABC 600ml", category: "Bahan Masak", suggestedPrice: 22000, unit: "pcs" }, // curated
  { barcode: "89910071000344", name: "Kecap Manis Bango 135ml", category: "Bahan Masak", suggestedPrice: 8500, unit: "pcs" }, // curated
  { barcode: "89910071000354", name: "Kecap Manis Bango 520ml", category: "Bahan Masak", suggestedPrice: 23000, unit: "pcs" }, // curated
  { barcode: "89910071000615", name: "Kelapa Sangrai 100g", category: "Bahan Masak", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910071000702", name: "Ketumbar Bubuk 50g", category: "Bahan Masak", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910071000695", name: "Lada Merica Bubuk 50g", category: "Bahan Masak", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "8888900415009", name: "LaFonte Spaghetti Pasta", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910071000277", name: "Maizena Kokok 500g", category: "Bahan Masak", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910071000297", name: "Margarina Palmia 250g", category: "Bahan Masak", suggestedPrice: 11000, unit: "pcs" }, // curated
  { barcode: "8992770033130", name: "Masako Ayam Kecil Rtg", category: "Bahan Masak", suggestedPrice: 6300, unit: "pcs" }, // off
  { barcode: "89910071000481", name: "Masako Rasa Ayam 230g", category: "Bahan Masak", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910071000491", name: "Masako Rasa Ayam 500g", category: "Bahan Masak", suggestedPrice: 16000, unit: "pcs" }, // curated
  { barcode: "89910071000304", name: "Mentega Wijsman 200g", category: "Bahan Masak", suggestedPrice: 15000, unit: "pcs" }, // curated
  { barcode: "89910071000033", name: "Minyak Goreng Bimoli Pouch 450ml", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910071000100", name: "Minyak Goreng Curah 1L", category: "Bahan Masak", suggestedPrice: 14000, unit: "pcs" }, // curated
  { barcode: "89910071000073", name: "Minyak Goreng Fortune 1L", category: "Bahan Masak", suggestedPrice: 17000, unit: "pcs" }, // curated
  { barcode: "89910071000083", name: "Minyak Goreng Fortune 2L", category: "Bahan Masak", suggestedPrice: 33000, unit: "pcs" }, // curated
  { barcode: "89910071000043", name: "Minyak Goreng Sania 1L", category: "Bahan Masak", suggestedPrice: 16000, unit: "pcs" }, // curated
  { barcode: "89910071000063", name: "Minyak Goreng Sania Pouch 450ml", category: "Bahan Masak", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910071000093", name: "Minyak Goreng Tropical 1L", category: "Bahan Masak", suggestedPrice: 17500, unit: "pcs" }, // curated
  { barcode: "8993176110074", name: "Minyak Kayu Putih", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910071000110", name: "Minyak Kelapa Sawit Curah 2L", category: "Bahan Masak", suggestedPrice: 28000, unit: "pcs" }, // curated
  { barcode: "89910071000879", name: "Oatmeal Quaker 500g", category: "Bahan Masak", suggestedPrice: 32000, unit: "pcs" }, // curated
  { barcode: "89910071000742", name: "Pala Bubuk 20g", category: "Bahan Masak", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910071000548", name: "Racik Bumbu Ayam Goreng 40g", category: "Bahan Masak", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "89910071000568", name: "Racik Bumbu Sop 40g", category: "Bahan Masak", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "89910071000558", name: "Racik Bumbu Tumis Sayur 40g", category: "Bahan Masak", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "8999999601331", name: "Royco Bumbu Kaldu Rasa Ayam", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910071000528", name: "Royco Kaldu Ayam 500g", category: "Bahan Masak", suggestedPrice: 17000, unit: "pcs" }, // curated
  { barcode: "89910071000508", name: "Royco Rasa Ayam 22g", category: "Bahan Masak", suggestedPrice: 2000, unit: "pcs" }, // curated
  { barcode: "89910071000518", name: "Royco Rasa Sapi 22g", category: "Bahan Masak", suggestedPrice: 2000, unit: "pcs" }, // curated
  { barcode: "8994907001302", name: "Sambal Terasi", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910071000605", name: "Santan Instan 65ml Sachet", category: "Bahan Masak", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "89910071000598", name: "Santan Kara 200ml", category: "Bahan Masak", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "8992770094117", name: "Saori Saos Tiram", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910071000421", name: "Saori Saus Tiram 140ml", category: "Bahan Masak", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910071000538", name: "Sasa Vetsin 250g", category: "Bahan Masak", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910071000441", name: "Saus BBQ Del Monte 190g", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910071000431", name: "Saus Salad Mayonnaise 200g", category: "Bahan Masak", suggestedPrice: 11000, unit: "pcs" }, // curated
  { barcode: "89910071000384", name: "Saus Sambal ABC 140ml", category: "Bahan Masak", suggestedPrice: 7500, unit: "pcs" }, // curated
  { barcode: "89910071000394", name: "Saus Sambal ABC 335ml", category: "Bahan Masak", suggestedPrice: 13000, unit: "pcs" }, // curated
  { barcode: "89910071000451", name: "Saus Teriyaki 190g", category: "Bahan Masak", suggestedPrice: 10000, unit: "pcs" }, // curated
  { barcode: "0089686401721", name: "Saus Tomat", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910071000411", name: "Saus Tomat ABC 200g", category: "Bahan Masak", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910071000401", name: "Saus Tomat Del Monte 200g", category: "Bahan Masak", suggestedPrice: 8500, unit: "pcs" }, // curated
  { barcode: "89910071000762", name: "Sereh Bubuk 20g", category: "Bahan Masak", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910071000859", name: "Soun Kering 250g", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "8999999000189", name: "Taro Net Potato BBQ 32gr", category: "Bahan Masak", suggestedPrice: 7200, unit: "pcs" }, // off
  { barcode: "89910071000849", name: "Telur Ayam Kampung 1kg", category: "Bahan Masak", suggestedPrice: 38000, unit: "pcs" }, // curated
  { barcode: "89910071000839", name: "Telur Ayam Negeri 1kg", category: "Bahan Masak", suggestedPrice: 28000, unit: "pcs" }, // curated
  { barcode: "89910071000227", name: "Tepung Beras 500g", category: "Bahan Masak", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910071000257", name: "Tepung Bumbu Serbaguna 500g", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910071000267", name: "Tepung Roti 250g", category: "Bahan Masak", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910071000247", name: "Tepung Sagu 500g", category: "Bahan Masak", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910071000217", name: "Tepung Serbaguna Bogasari 500g", category: "Bahan Masak", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910071000237", name: "Tepung Tapioka 500g", category: "Bahan Masak", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910071000207", name: "Tepung Terigu Cakra Kembar 1kg", category: "Bahan Masak", suggestedPrice: 14000, unit: "pcs" }, // curated
  { barcode: "8993296201119", name: "Tepung Terigu Segitiga Biru", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910071000180", name: "Tepung Terigu Segitiga Biru 1kg", category: "Bahan Masak", suggestedPrice: 13000, unit: "pcs" }, // curated
  { barcode: "89910071000190", name: "Tepung Terigu Segitiga Biru 500g", category: "Bahan Masak", suggestedPrice: 7500, unit: "pcs" }, // curated
  { barcode: "89910071000645", name: "Terasi Udang 100g", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "8991818030070", name: "Uleg Sambal Pedas Serbaguna", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "8996001526231", name: "WOW Spaghetti Bolognese", category: "Bahan Masak", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "89910081000577", name: "Baby Oil 60ml", category: "Kebutuhan Rumah", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910081000557", name: "Balsem AA 10g", category: "Kebutuhan Rumah", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910081000450", name: "Baterai ABC AAA isi 2", category: "Kebutuhan Rumah", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910081000460", name: "Baterai Panasonic AA isi 2", category: "Kebutuhan Rumah", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910081000206", name: "Deterjen B-29 800g", category: "Kebutuhan Rumah", suggestedPrice: 15000, unit: "pcs" }, // curated
  { barcode: "89910081000226", name: "Deterjen Boom 770g", category: "Kebutuhan Rumah", suggestedPrice: 14000, unit: "pcs" }, // curated
  { barcode: "89910081000199", name: "Deterjen Daia 800g", category: "Kebutuhan Rumah", suggestedPrice: 16000, unit: "pcs" }, // curated
  { barcode: "89910081000179", name: "Deterjen Rinso 800g", category: "Kebutuhan Rumah", suggestedPrice: 23000, unit: "pcs" }, // curated
  { barcode: "89910081000189", name: "Deterjen Rinso Anti Noda 1.8kg", category: "Kebutuhan Rumah", suggestedPrice: 48000, unit: "pcs" }, // curated
  { barcode: "89910081000216", name: "Deterjen Satu Sachet 35g", category: "Kebutuhan Rumah", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "89910081000624", name: "Ember Plastik Kecil 1 pcs", category: "Kebutuhan Rumah", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910081000614", name: "Gayung Plastik 1 pcs", category: "Kebutuhan Rumah", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910081000597", name: "Hand Sanitizer 60ml", category: "Kebutuhan Rumah", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910081000353", name: "Insektisida Baygon Aerosol 600ml", category: "Kebutuhan Rumah", suggestedPrice: 23000, unit: "pcs" }, // curated
  { barcode: "89910081000363", name: "Insektisida HIT Aerosol 600ml", category: "Kebutuhan Rumah", suggestedPrice: 22000, unit: "pcs" }, // curated
  { barcode: "89910081000644", name: "Kain Pel Lantai 1 pcs", category: "Kebutuhan Rumah", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910081000684", name: "Kantong Plastik Hitam 1 slop", category: "Kebutuhan Rumah", suggestedPrice: 15000, unit: "pcs" }, // curated
  { barcode: "89910081000430", name: "Kapas Stem Buddy 50 pcs", category: "Kebutuhan Rumah", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910081000420", name: "Kapas Wajah 455 sheet", category: "Kebutuhan Rumah", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910081000373", name: "Kapur Semut ABC", category: "Kebutuhan Rumah", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "89910081000333", name: "Karbol Lantai 500ml", category: "Kebutuhan Rumah", suggestedPrice: 12000, unit: "pcs" }, // curated
  { barcode: "89910081000490", name: "Korek Api Batang 1 slop", category: "Kebutuhan Rumah", suggestedPrice: 2000, unit: "pcs" }, // curated
  { barcode: "89910081000664", name: "Lap Dapur 1 pcs", category: "Kebutuhan Rumah", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910081000701", name: "Lilin Metik isi 10", category: "Kebutuhan Rumah", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910081000604", name: "Masker Medis isi 10", category: "Kebutuhan Rumah", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910081000527", name: "Minyak Angin Cap Lang 10ml", category: "Kebutuhan Rumah", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910081000537", name: "Minyak Angin Telon 30ml", category: "Kebutuhan Rumah", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910081000547", name: "Minyak Kayu Putih 30ml", category: "Kebutuhan Rumah", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910081000149", name: "Pasta Gigi Close Up 130g", category: "Kebutuhan Rumah", suggestedPrice: 12000, unit: "pcs" }, // curated
  { barcode: "89910081000139", name: "Pasta Gigi Pepsodent 190g", category: "Kebutuhan Rumah", suggestedPrice: 14500, unit: "pcs" }, // curated
  { barcode: "89910081000159", name: "Pasta Gigi Sensodyne 100g", category: "Kebutuhan Rumah", suggestedPrice: 28000, unit: "pcs" }, // curated
  { barcode: "89910081000169", name: "Pasta Gigi Siwak F 190g", category: "Kebutuhan Rumah", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910081000507", name: "Pembalut Soften isi 5", category: "Kebutuhan Rumah", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910081000517", name: "Pembalut Whisper isi 5", category: "Kebutuhan Rumah", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910081000323", name: "Pembersih Kaca Spray 500ml", category: "Kebutuhan Rumah", suggestedPrice: 15000, unit: "pcs" }, // curated
  { barcode: "89910081000313", name: "Pembersih Lantai Mister Muscle 500ml", category: "Kebutuhan Rumah", suggestedPrice: 15000, unit: "pcs" }, // curated
  { barcode: "89910081000303", name: "Pembersih Lantai Wipol 450ml", category: "Kebutuhan Rumah", suggestedPrice: 13000, unit: "pcs" }, // curated
  { barcode: "89910081000343", name: "Pemutih Pakaian Bayclin 500ml", category: "Kebutuhan Rumah", suggestedPrice: 11000, unit: "pcs" }, // curated
  { barcode: "89910081000296", name: "Pewangi Downy 800ml", category: "Kebutuhan Rumah", suggestedPrice: 18000, unit: "pcs" }, // curated
  { barcode: "89910081000276", name: "Pewangi Pakaian Molto 800ml", category: "Kebutuhan Rumah", suggestedPrice: 17000, unit: "pcs" }, // curated
  { barcode: "89910081000286", name: "Pewangi Pakaian Molto Sachet 27ml", category: "Kebutuhan Rumah", suggestedPrice: 1500, unit: "pcs" }, // curated
  { barcode: "89910081000711", name: "Pewangi Ruangan 250ml", category: "Kebutuhan Rumah", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910081000674", name: "Plastik Kresek 1 slop", category: "Kebutuhan Rumah", suggestedPrice: 12000, unit: "pcs" }, // curated
  { barcode: "89910081000256", name: "Sabun Cuci Piring Mama 420ml", category: "Kebutuhan Rumah", suggestedPrice: 10000, unit: "pcs" }, // curated
  { barcode: "89910081000266", name: "Sabun Cuci Piring Sachet 20ml", category: "Kebutuhan Rumah", suggestedPrice: 1000, unit: "pcs" }, // curated
  { barcode: "89910081000246", name: "Sabun Cuci Piring Sunlight 400ml", category: "Kebutuhan Rumah", suggestedPrice: 10000, unit: "pcs" }, // curated
  { barcode: "89910081000236", name: "Sabun Cuci Piring Sunlight 755ml", category: "Kebutuhan Rumah", suggestedPrice: 17000, unit: "pcs" }, // curated
  { barcode: "89910081000587", name: "Sabun Cuci Tangan Lifebuoy 185ml", category: "Kebutuhan Rumah", suggestedPrice: 10000, unit: "pcs" }, // curated
  { barcode: "89910081000062", name: "Sabun Guardian 110g", category: "Kebutuhan Rumah", suggestedPrice: 5500, unit: "pcs" }, // curated
  { barcode: "89910081000052", name: "Sabun Mandi Citra 85g", category: "Kebutuhan Rumah", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910081000032", name: "Sabun Mandi Dove 110g", category: "Kebutuhan Rumah", suggestedPrice: 8500, unit: "pcs" }, // curated
  { barcode: "89910081000012", name: "Sabun Mandi Lifebuoy 110g", category: "Kebutuhan Rumah", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910081000022", name: "Sabun Mandi Lux 85g", category: "Kebutuhan Rumah", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910081000042", name: "Sabun Mandi Nuvo 95g", category: "Kebutuhan Rumah", suggestedPrice: 4500, unit: "pcs" }, // curated
  { barcode: "89910081000634", name: "Sapu Ijuk 1 pcs", category: "Kebutuhan Rumah", suggestedPrice: 10000, unit: "pcs" }, // curated
  { barcode: "89910081000470", name: "Senter Kecil 1 pcs", category: "Kebutuhan Rumah", suggestedPrice: 15000, unit: "pcs" }, // curated
  { barcode: "89910081000119", name: "Shampo Clear Botol 170ml", category: "Kebutuhan Rumah", suggestedPrice: 23000, unit: "pcs" }, // curated
  { barcode: "89910081000072", name: "Shampo Clear Sachet 9ml", category: "Kebutuhan Rumah", suggestedPrice: 1000, unit: "pcs" }, // curated
  { barcode: "89910081000109", name: "Shampo Dove Sachet 10ml", category: "Kebutuhan Rumah", suggestedPrice: 2000, unit: "pcs" }, // curated
  { barcode: "89910081000092", name: "Shampo Pantene Sachet 10ml", category: "Kebutuhan Rumah", suggestedPrice: 2000, unit: "pcs" }, // curated
  { barcode: "89910081000129", name: "Shampo Sunsilk Botol 160ml", category: "Kebutuhan Rumah", suggestedPrice: 22000, unit: "pcs" }, // curated
  { barcode: "89910081000082", name: "Shampo Sunsilk Sachet 9ml", category: "Kebutuhan Rumah", suggestedPrice: 1000, unit: "pcs" }, // curated
  { barcode: "89910081000654", name: "Spons Cuci Piring isi 3", category: "Kebutuhan Rumah", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910081000694", name: "Tali Rafia 1 gulung", category: "Kebutuhan Rumah", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910081000400", name: "Tissue Basah Mitu 40 sheet", category: "Kebutuhan Rumah", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910081000410", name: "Tisu Wajah 150 sheet", category: "Kebutuhan Rumah", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910081000567", name: "Vicks VapoRub 15g", category: "Kebutuhan Rumah", suggestedPrice: 11000, unit: "pcs" }, // curated
  { barcode: "0089686723021", name: "Chiki Twist Jagung Bakar", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "5010477346032", name: "Crunchy Oat Granola Tropical Fruits", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "8998888710598", name: "Del Monte Extra Hot 200g", category: "Lainnya", suggestedPrice: 9000, unit: "pcs" }, // off
  { barcode: "8852756707045", name: "Froot Loops", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "8993027164034", name: "Happy Tos Jagung Bakar Biru", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "8991002135376", name: "Kapal Api Spesial Mix", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "8995952001224", name: "Kaya Spread", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "8995555171225", name: "Kimbo Reddi Sosis Ikan Otak-Otak", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "8996001523247", name: "Mi Gelas Baso Sapi 26gr", category: "Lainnya", suggestedPrice: 4000, unit: "pcs" }, // off
  { barcode: "9323795000187", name: "Monster Tropical Muesli", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "8993175540797", name: "Nextar Brownies 8x10g", category: "Lainnya", suggestedPrice: 4000, unit: "pcs" }, // off
  { barcode: "8993175538947", name: "Nextar Nastar Nanas 112g", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "8886467100017", name: "Pringles Original", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "4545593011447", name: "SOP SUBARASHI", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "8996001524008", name: "Super Bubur Ayam", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "8998898101416", name: "Tolak Angin Cair", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "8992994110112", name: "Yakult", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "8992741905787", name: "Youvit Multivitamin", category: "Lainnya", suggestedPrice: 5000, unit: "pcs" }, // off
  { barcode: "89910031000465", name: "Bakmi Goreng Spesial ABC 85g", category: "Makanan Instan", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "89910031000231", name: "Bakmi Mewah Ayam Bawang 85g", category: "Makanan Instan", suggestedPrice: 3200, unit: "pcs" }, // curated
  { barcode: "89910031000221", name: "Bakmi Mewah Goreng 85g", category: "Makanan Instan", suggestedPrice: 3300, unit: "pcs" }, // curated
  { barcode: "89910031000415", name: "Bihun Jaguar Goreng 75g", category: "Makanan Instan", suggestedPrice: 3200, unit: "pcs" }, // curated
  { barcode: "89910031000425", name: "Bihun Soun Super 65g", category: "Makanan Instan", suggestedPrice: 2800, unit: "pcs" }, // curated
  { barcode: "89910031000328", name: "Corned Beef Peter's 198g", category: "Makanan Instan", suggestedPrice: 26000, unit: "pcs" }, // curated
  { barcode: "89910031000318", name: "Corned Beef Pronas 198g", category: "Makanan Instan", suggestedPrice: 27000, unit: "pcs" }, // curated
  { barcode: "8996001440049", name: "ENERGEN COKLAT 34g", category: "Makanan Instan", suggestedPrice: 2800, unit: "pcs" }, // off
  { barcode: "89910031000358", name: "Energen Jagung Bakar 34g", category: "Makanan Instan", suggestedPrice: 5500, unit: "pcs" }, // curated
  { barcode: "89910031000368", name: "Energen Kurma 34g", category: "Makanan Instan", suggestedPrice: 5500, unit: "pcs" }, // curated
  { barcode: "89910031000348", name: "Energen Vanila 34g", category: "Makanan Instan", suggestedPrice: 5500, unit: "pcs" }, // curated
  { barcode: "89910031000211", name: "Gaga 100 Ayam Bawang 86g", category: "Makanan Instan", suggestedPrice: 3200, unit: "pcs" }, // curated
  { barcode: "89910031000201", name: "Gaga 100 Mi Goreng 93g", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // curated
  { barcode: "8992718853158", name: "Gekikara Ramen Jamur 109G", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "8992718853868", name: "Gekikara Ramen Pas Hot Carbo", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "0089686010015", name: "Indomie Ayam Bawang", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "89910031000077", name: "Indomie Cup Kari Ayam 77g", category: "Makanan Instan", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910031000067", name: "Indomie Cup Mi Goreng 82g", category: "Makanan Instan", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910031000388", name: "Indomie Goreng Ayam Geprek 133g", category: "Makanan Instan", suggestedPrice: 6500, unit: "pcs" }, // curated
  { barcode: "89910031000378", name: "Indomie Goreng Rendang 129g", category: "Makanan Instan", suggestedPrice: 6500, unit: "pcs" }, // curated
  { barcode: "0089686910704", name: "Indomie Goreng Rendang 5x91g", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "0089686040227", name: "Indomie K-Rose Goreng", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "0089686010527", name: "Indomie Kari Ayam", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "0089686043433", name: "Indomie Mi Goreng Ayam Geprek", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "89910031000047", name: "Indomie Mi Goreng Ayam Panggang 70g", category: "Makanan Instan", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910031000017", name: "Indomie Mi Goreng Barbeque Chicken 79g", category: "Makanan Instan", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910031000037", name: "Indomie Mi Goreng Black Pepper Beef 77g", category: "Makanan Instan", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910031000027", name: "Indomie Mi Goreng Hot & Spicy 78g", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // curated
  { barcode: "0089686041705", name: "Indomie Mi Goreng Jumbo", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "0089686041767", name: "Indomie Mi Goreng Jumbo Panggang", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "0089686010947", name: "Indomie Mi Goreng Original", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "0089686945003", name: "Indomie Pop Spageti Spicy Bolognese", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "89910031000057", name: "Indomie Soto Mie 86g", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // curated
  { barcode: "0089686010343", name: "Indomie Soto Mie Kotak", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "89910031000338", name: "Kornet Sapi ABC 198g", category: "Makanan Instan", suggestedPrice: 38000, unit: "pcs" }, // curated
  { barcode: "89910031000251", name: "Lemonilo Ayam Bawang 75g", category: "Makanan Instan", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "8997014021867", name: "Lemonilo Chimi Keripik Ubi Balado", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "89910031000241", name: "Lemonilo Mi Goreng 75g", category: "Makanan Instan", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910031000455", name: "Mami Goreng Spesial 85g", category: "Makanan Instan", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "8998866200301", name: "Mi Sedaap", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "89910031000435", name: "Mie Honjen Goreng 80g", category: "Makanan Instan", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "89910031000405", name: "Mie Instan Cup Ayam Bawang (generic) 65g", category: "Makanan Instan", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910031000114", name: "Mie Sedaap Cup Goreng 75g", category: "Makanan Instan", suggestedPrice: 6500, unit: "pcs" }, // curated
  { barcode: "89910031000087", name: "Mie Sedaap Goreng Ayam Krispi 91g", category: "Makanan Instan", suggestedPrice: 3400, unit: "pcs" }, // curated
  { barcode: "89910031000097", name: "Mie Sedaap Goreng Double 133g", category: "Makanan Instan", suggestedPrice: 6500, unit: "pcs" }, // curated
  { barcode: "89910031000398", name: "Mie Sedaap Goreng Rasa Sambal Terasi 91g", category: "Makanan Instan", suggestedPrice: 3400, unit: "pcs" }, // curated
  { barcode: "89910031000104", name: "Mie Sedaap Kari Ayam Spesial 83g", category: "Makanan Instan", suggestedPrice: 3200, unit: "pcs" }, // curated
  { barcode: "89910031000124", name: "Mie Sedaap Selebaran Goreng 95g", category: "Makanan Instan", suggestedPrice: 4500, unit: "pcs" }, // curated
  { barcode: "89910031000134", name: "Mie Sedaap Soto Lamongan 83g", category: "Makanan Instan", suggestedPrice: 3200, unit: "pcs" }, // curated
  { barcode: "89910031000271", name: "Pop Mie Kari Ayam 75g", category: "Makanan Instan", suggestedPrice: 4500, unit: "pcs" }, // curated
  { barcode: "0089686060027", name: "Pop Mie Rasa Ayam", category: "Makanan Instan", suggestedPrice: 3500, unit: "pcs" }, // off
  { barcode: "89910031000261", name: "Pop Mie Soto 75g", category: "Makanan Instan", suggestedPrice: 4500, unit: "pcs" }, // curated
  { barcode: "89910031000291", name: "Sarden ABC Extra Pedas 155g", category: "Makanan Instan", suggestedPrice: 11500, unit: "pcs" }, // curated
  { barcode: "89910031000281", name: "Sarden ABC Saos Tomat 155g", category: "Makanan Instan", suggestedPrice: 11000, unit: "pcs" }, // curated
  { barcode: "89910031000308", name: "Sarden Botan Saos Tomat 155g", category: "Makanan Instan", suggestedPrice: 10000, unit: "pcs" }, // curated
  { barcode: "89910031000174", name: "Sarimi Ayam Bawang 79g", category: "Makanan Instan", suggestedPrice: 2700, unit: "pcs" }, // curated
  { barcode: "89910031000194", name: "Sarimi Cup Isi 2 Goreng 120g", category: "Makanan Instan", suggestedPrice: 8500, unit: "pcs" }, // curated
  { barcode: "89910031000164", name: "Sarimi Goreng 83g", category: "Makanan Instan", suggestedPrice: 2800, unit: "pcs" }, // curated
  { barcode: "89910031000184", name: "Sarimi Soto 79g", category: "Makanan Instan", suggestedPrice: 2700, unit: "pcs" }, // curated
  { barcode: "89910031000154", name: "Supermi Cup Ayam Bawang 62g", category: "Makanan Instan", suggestedPrice: 5500, unit: "pcs" }, // curated
  { barcode: "89910031000144", name: "Supermi Goreng 86g", category: "Makanan Instan", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "89910031000445", name: "Wai Wai Quick Goreng 70g", category: "Makanan Instan", suggestedPrice: 3200, unit: "pcs" }, // curated
  { barcode: "89910041000698", name: "ABC White Coffee 30g", category: "Minuman", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "89910041000892", name: "Adem Sari Botol 320ml", category: "Minuman", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "8992772586030", name: "Adem Sari Herbal Lemon Kaleng", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8994588342114", name: "Air Mineral", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000424", name: "Aloha Yoghurt Drink Guava 250ml", category: "Minuman", suggestedPrice: 5500, unit: "pcs" }, // curated
  { barcode: "89910041000103", name: "Amidis Botol 600ml", category: "Minuman", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "8997225840028", name: "Aoka Bread Chocolate", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8997225840134", name: "Aoka Susu", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8886008101091", name: "AQUA", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8886008101138", name: "Aqua Botol", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000016", name: "Aqua Botol 330ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "8886008101336", name: "Aqua Botol Kecil", category: "Minuman", suggestedPrice: 3200, unit: "pcs" }, // off
  { barcode: "89910041000026", name: "Aqua Galon isi ulang 19L", category: "Minuman", suggestedPrice: 21000, unit: "pcs" }, // curated
  { barcode: "8998866632287", name: "Aquviva 600ml", category: "Minuman", suggestedPrice: 8100, unit: "pcs" }, // off
  { barcode: "8992696404441", name: "Bear Brand Milk Susu Steril", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000561", name: "Bear Brand Steril 189ml", category: "Minuman", suggestedPrice: 8500, unit: "pcs" }, // curated
  { barcode: "89910041000581", name: "Bendera Kental Manis Sachet 190g", category: "Minuman", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "8996001354124", name: "Beng-beng Extra Chocolate Caramel", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8999898971221", name: "Biokul Greek Yogurt Plain", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8999898962694", name: "Biokul Set Yog Plain", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000414", name: "Buavita Apel 250ml", category: "Minuman", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "8998009020223", name: "Buavita Apple", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000397", name: "Buavita Jeruk 250ml", category: "Minuman", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "8998009020186", name: "Buavita Juice Jambu 245ml", category: "Minuman", suggestedPrice: 3600, unit: "pcs" }, // off
  { barcode: "8998009020193", name: "Buavita Juice Mango 245ml", category: "Minuman", suggestedPrice: 3600, unit: "pcs" }, // off
  { barcode: "8998009020216", name: "Buavita Lychee 245ml", category: "Minuman", suggestedPrice: 3600, unit: "pcs" }, // off
  { barcode: "89910041000404", name: "Buavita Mangga 250ml", category: "Minuman", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "8997240601154", name: "Caramel Macchiato Oat Milk", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8992775311981", name: "Chocolatos", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8992775311615", name: "Chocolatos 24Pcs", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8992775001608", name: "Chocolatos Cheese Flavor", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8993200666836", name: "Cimory Susu Almond", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000638", name: "Cimory Susu Coklat 250ml", category: "Minuman", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910041000628", name: "Cimory Yogurt Drink 250ml", category: "Minuman", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "8996129809131", name: "Cleo", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8996129803504", name: "Cleo Botol", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000096", name: "Cleo Botol 1500ml", category: "Minuman", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "0896867700326", name: "Club Air Mineral", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000086", name: "Club Botol 380ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "8992761111519", name: "Coca Cola Botol", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8992761002015", name: "Coca Cola Btl 390ml", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8992761131012", name: "Coca Cola Zero", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8992761136161", name: "Coca-Cola 1 Lt", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000270", name: "Coca-Cola Botol 780ml", category: "Minuman", suggestedPrice: 11000, unit: "pcs" }, // curated
  { barcode: "8996001601051", name: "Collagena", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8997240602854", name: "Creamy Classic Oat M*lk", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000541", name: "Dancow FortiGro 500g", category: "Minuman", suggestedPrice: 42000, unit: "pcs" }, // curated
  { barcode: "89910041000551", name: "Dancow FortiGro Sachet 30g", category: "Minuman", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "8999898962533", name: "Diamond UHT Full Cream 1L", category: "Minuman", suggestedPrice: 11700, unit: "pcs" }, // off
  { barcode: "8996001431030", name: "Drink Beng-beng", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8996001440124", name: "Energen Serbuk Cereal Susu Vanilla", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000909", name: "Extra Joss Sachet 6g", category: "Minuman", suggestedPrice: 2000, unit: "pcs" }, // curated
  { barcode: "8992761002039", name: "Fanta", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000290", name: "Fanta Orange Botol 390ml", category: "Minuman", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910041000327", name: "Fanta Orange Kaleng 300ml", category: "Minuman", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910041000280", name: "Fanta Strawberry Botol 390ml", category: "Minuman", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "8992753004010", name: "Fisian Flag", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8998866500708", name: "Floridina Orange 350ML", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000220", name: "Frestea Apple 350ml", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // curated
  { barcode: "89910041000210", name: "Frestea Melati 350ml", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // curated
  { barcode: "89910041000494", name: "Frisian Flag Coklat 250ml", category: "Minuman", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "8992753005499", name: "Frisian Flag Full Cream 1 L", category: "Minuman", suggestedPrice: 11700, unit: "pcs" }, // off
  { barcode: "89910041000571", name: "Frisian Flag Kental Manis Kaleng 320g", category: "Minuman", suggestedPrice: 12000, unit: "pcs" }, // curated
  { barcode: "8992753721597", name: "Frisian Flag SKM Pouch 280", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000501", name: "Frisian Flag Strawberry 250ml", category: "Minuman", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "8992753700301", name: "Frisian Flag UHT Coconut 946ml", category: "Minuman", suggestedPrice: 8100, unit: "pcs" }, // off
  { barcode: "8998866202893", name: "Golda Coffee Cappuchino", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8998866201841", name: "Golda Coffee Latte", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000795", name: "Golda Coffee Sachet 25g", category: "Minuman", suggestedPrice: 2800, unit: "pcs" }, // curated
  { barcode: "89910041000755", name: "Gooday Coffee Sachet 25g", category: "Minuman", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "89910041000618", name: "Greenfields Coklat 250ml", category: "Minuman", suggestedPrice: 7500, unit: "pcs" }, // curated
  { barcode: "8993351124025", name: "GreenFields Full Cream", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000608", name: "Greenfields Full Cream 1L", category: "Minuman", suggestedPrice: 25000, unit: "pcs" }, // curated
  { barcode: "8993351121307", name: "GreenFields Full Cream Milk", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8993351128306", name: "GreenFields Low Fat", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8997225200051", name: "Greensand Lime Apple", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8999908808905", name: "Hemaviton C1000 Ls Can", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000862", name: "Hydro Coco 250ml", category: "Minuman", suggestedPrice: 6500, unit: "pcs" }, // curated
  { barcode: "8997009781110", name: "Hydro Coco Ori", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8992858527308", name: "Hydro Coco Original 250ml", category: "Minuman", suggestedPrice: 3600, unit: "pcs" }, // off
  { barcode: "89910041000193", name: "Ichi Ocha Melati 350ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910041000200", name: "Ichi Ocha Oolong 350ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "8992702005945", name: "Indomilk Coklat Btl 190ML", category: "Minuman", suggestedPrice: 3600, unit: "pcs" }, // off
  { barcode: "8993007003902", name: "Indomilk Creamy Original", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8993007000239", name: "Indomilk Kids Chocolate UHT Milk", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000474", name: "Indomilk UHT Coklat 250ml", category: "Minuman", suggestedPrice: 5500, unit: "pcs" }, // curated
  { barcode: "89910041000484", name: "Indomilk UHT Full Cream 250ml", category: "Minuman", suggestedPrice: 5500, unit: "pcs" }, // curated
  { barcode: "8993007000680", name: "Indomilk UHT Full Cream Plain", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8997035600546", name: "Ion Supply Drink 900ml", category: "Minuman", suggestedPrice: 8100, unit: "pcs" }, // off
  { barcode: "89910041000882", name: "Ion Supply Drink Botol 900ml", category: "Minuman", suggestedPrice: 10000, unit: "pcs" }, // curated
  { barcode: "8998866610377", name: "Iso Plus 350 Ml", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000872", name: "Isoplus Botol 350ml", category: "Minuman", suggestedPrice: 5500, unit: "pcs" }, // curated
  { barcode: "8998866203531", name: "Isoplus Coco 350ml", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000648", name: "Kapal Api Special 165g", category: "Minuman", suggestedPrice: 12000, unit: "pcs" }, // curated
  { barcode: "89910041000658", name: "Kapal Api Special Mix Gula Aren 28g", category: "Minuman", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "89910041000668", name: "Kapal Api Susu 15g", category: "Minuman", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "89910041000725", name: "Kopiko Black Coffee 28g", category: "Minuman", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "89910041000735", name: "Kopiko Blanca 28g", category: "Minuman", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "89910041000745", name: "Kopiko Cappuccino 28g", category: "Minuman", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "89910041000919", name: "Kratingdaeng Botol 150ml", category: "Minuman", suggestedPrice: 6500, unit: "pcs" }, // curated
  { barcode: "89910041000929", name: "Kratingdaeng Kaleng 250ml", category: "Minuman", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "8995227500261", name: "Larutan Penyegar", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000939", name: "Larutan Penyegar Cap Badak 150ml", category: "Minuman", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "8999988888842", name: "Larutan Penyegar Cap Badak Jambu 320ml", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8996001600399", name: "Le Minerale 1.5l", category: "Minuman", suggestedPrice: 11700, unit: "pcs" }, // off
  { barcode: "89910041000066", name: "Le Minerale Botol 1500ml", category: "Minuman", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910041000076", name: "Le Minerale Gelas 240ml", category: "Minuman", suggestedPrice: 2000, unit: "pcs" }, // curated
  { barcode: "8996001600375", name: "Le Minerale Mini 330 Ml", category: "Minuman", suggestedPrice: 3200, unit: "pcs" }, // off
  { barcode: "8994171101081", name: "Luwak Kopi Gula", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8994171101289", name: "Luwak White Coffee Rtg", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000775", name: "Luwak White Coffee Sachet 30g", category: "Minuman", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "8998888110114", name: "Marjan", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8998866203920", name: "Milku", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8998866202725", name: "Milku Coklat Btl 200ml", category: "Minuman", suggestedPrice: 3600, unit: "pcs" }, // off
  { barcode: "8998866202732", name: "Milku Stroberi 200ml", category: "Minuman", suggestedPrice: 3600, unit: "pcs" }, // off
  { barcode: "8992696521797", name: "Milo", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000521", name: "Milo Activ-Go Kaleng 240ml", category: "Minuman", suggestedPrice: 8500, unit: "pcs" }, // curated
  { barcode: "89910041000531", name: "Milo Activ-Go Sachet 20g", category: "Minuman", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "89910041000511", name: "Milo UHT 180ml", category: "Minuman", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "8992752112518", name: "Mizone", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000822", name: "Mizone Activ Lychee 500ml", category: "Minuman", suggestedPrice: 6500, unit: "pcs" }, // curated
  { barcode: "8992752112013", name: "Mizone Activ Lychee Lemon", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000832", name: "Mizone Citrus 500ml", category: "Minuman", suggestedPrice: 6500, unit: "pcs" }, // curated
  { barcode: "8996001600269", name: "Mountain Mineral Water", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "9556001288547", name: "Nescafe Cappucino 220ml", category: "Minuman", suggestedPrice: 3600, unit: "pcs" }, // off
  { barcode: "89910041000705", name: "Nescafe Classic 100g", category: "Minuman", suggestedPrice: 21000, unit: "pcs" }, // curated
  { barcode: "9556001295248", name: "Nescafe Ice Black 220ml", category: "Minuman", suggestedPrice: 3600, unit: "pcs" }, // off
  { barcode: "89910041000715", name: "Nescafe Sachet 20g", category: "Minuman", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "89910041000113", name: "Nestle Pure Life 600ml", category: "Minuman", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "8996001600849", name: "Nipis Madu Smooth Soda Lime", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8992982206001", name: "Npl 600 Ml", category: "Minuman", suggestedPrice: 8100, unit: "pcs" }, // off
  { barcode: "89910041000367", name: "Nutrisari Anggur 350ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910041000357", name: "Nutrisari Jeruk 350ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910041000377", name: "Nutrisari Mangga 350ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910041000387", name: "Nutrisari Muscat 350ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "8997240600010", name: "Oat Milk", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8997240600393", name: "Oatside Oat Milk Barista Blend", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000591", name: "Omela Kental Manis Sachet 185g", category: "Minuman", suggestedPrice: 6500, unit: "pcs" }, // curated
  { barcode: "8997035601222", name: "Oranamin C Drink", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8997009510123", name: "Orange Water", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000337", name: "Pepsi Botol 390ml", category: "Minuman", suggestedPrice: 6500, unit: "pcs" }, // curated
  { barcode: "8997035563544", name: "POCARI SWEAT 350ml", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000812", name: "Pocari Sweat Botol 350ml", category: "Minuman", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910041000802", name: "Pocari Sweat Botol 500ml", category: "Minuman", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "8997035120020", name: "Pocari Sweat Sachet", category: "Minuman", suggestedPrice: 3200, unit: "pcs" }, // off
  { barcode: "8999510785540", name: "Pristine", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8992753033744", name: "Purefarm Full Cream", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8996001304990", name: "Sari Gandum Susu Cokelat", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000999", name: "Sari Kacang Ijo Nutrisari 350ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "8999999195649", name: "Sari Wangi 100% Teh Asli", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8999999556327", name: "Sariwangi Teh Celup Asli 25s", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000989", name: "Sirup ABC Jeruk 525ml", category: "Minuman", suggestedPrice: 15000, unit: "pcs" }, // curated
  { barcode: "89910041000979", name: "Sirup Marjan Cocopandan 460ml", category: "Minuman", suggestedPrice: 14000, unit: "pcs" }, // curated
  { barcode: "89910041000969", name: "Sirup Marjan Melon 460ml", category: "Minuman", suggestedPrice: 14000, unit: "pcs" }, // curated
  { barcode: "89910041000347", name: "Soda Gembira Sirup 480ml", category: "Minuman", suggestedPrice: 18000, unit: "pcs" }, // curated
  { barcode: "89910041000240", name: "Sosro Tea Kaleng 300ml", category: "Minuman", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "8996006000019", name: "Sosro Tea Original 300Ml", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000307", name: "Sprite Botol 390ml", category: "Minuman", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910041000317", name: "Sprite Kaleng 300ml", category: "Minuman", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "8993351120416", name: "Strawberry Yogurt Drink", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8992696525054", name: "Susu Dancow Vanilla", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041001015", name: "Susu Kacang Soya Home Made 250ml", category: "Minuman", suggestedPrice: 3500, unit: "pcs" }, // curated
  { barcode: "89910041001005", name: "Susu Kedelai Murni 250ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "8991102374309", name: "Tango Wafer Chocolate", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8996006858030", name: "Teh Botol Less Sugar", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000123", name: "Teh Botol Sosro Kotak 250ml", category: "Minuman", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910041000133", name: "Teh Botol Sosro Less Sugar 450ml", category: "Minuman", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "9199406858030", name: "Teh Botol Sosro Less Sugar Kotak", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "0996646000019", name: "Teh Botol Sosro Original Botol", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8886007811113", name: "Teh Cap Poci", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000173", name: "Teh Gelas Batang 300ml", category: "Minuman", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "8991102222006", name: "Teh Gelas Cup", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000183", name: "Teh Gelas Kotak 300ml", category: "Minuman", suggestedPrice: 3500, unit: "pcs" }, // curated
  { barcode: "8998009040023", name: "Teh Kotak Teh Melati", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000230", name: "Teh Kotak Ultra 300ml", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // curated
  { barcode: "8886007811410", name: "Teh Poci Celup Wangi 25s", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000163", name: "Teh Pucuk Harum 600ml", category: "Minuman", suggestedPrice: 5500, unit: "pcs" }, // curated
  { barcode: "8996001600146", name: "Teh Pucuk Harum Jasmine 350 Ml", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8996001600252", name: "Teh Pucuk Harum Less Sugar", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000959", name: "Teh Tawar Siap Minum 250ml", category: "Minuman", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "8996006858016", name: "Tehbotol Sosro Original", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000949", name: "Tolak Angin Cair 15ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "8998866202626", name: "Top Coffee Palm Sugar", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000785", name: "Top Coffee Susu 25g", category: "Minuman", suggestedPrice: 2800, unit: "pcs" }, // curated
  { barcode: "89910041000688", name: "Torabika Cappuccino 25g", category: "Minuman", suggestedPrice: 2800, unit: "pcs" }, // curated
  { barcode: "89910041000678", name: "Torabika Duo Coffee 32g", category: "Minuman", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "8998009010620", name: "Ultra Coklat", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000444", name: "Ultra Milk Coklat 250ml", category: "Minuman", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "8998009010613", name: "Ultra Milk Full Cream", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910041000434", name: "Ultra Milk Full Cream 1L", category: "Minuman", suggestedPrice: 19000, unit: "pcs" }, // curated
  { barcode: "8998009011740", name: "Ultra Milk Karamel 200ml", category: "Minuman", suggestedPrice: 3600, unit: "pcs" }, // off
  { barcode: "8998009010637", name: "Ultra Milk Low Fat", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8998009011214", name: "Ultra Milk Low Fat Chocolate", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8998009010590", name: "ULTRA MILK MINI CHOCO", category: "Minuman", suggestedPrice: 3200, unit: "pcs" }, // off
  { barcode: "89910041000454", name: "Ultra Milk Strawberry 250ml", category: "Minuman", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "8998009010248", name: "Ultra Milk Stroberi 250 Ml", category: "Minuman", suggestedPrice: 3600, unit: "pcs" }, // off
  { barcode: "8998009010927", name: "Ultra Mimi Kids Stroberi 125ML", category: "Minuman", suggestedPrice: 3600, unit: "pcs" }, // off
  { barcode: "89910041000046", name: "Vit Botol 380ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910041000056", name: "Vit Box 250ml", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // curated
  { barcode: "89910041000765", name: "White Louver Coffee 25g", category: "Minuman", suggestedPrice: 2800, unit: "pcs" }, // curated
  { barcode: "89910041000852", name: "You C1000 Botol 140ml", category: "Minuman", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910041000842", name: "You C1000 Botol 500ml", category: "Minuman", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "8997009510017", name: "You C1000 Vitamin Lemon", category: "Minuman", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "89910061000345", name: "Camel Mild 20", category: "Rokok", suggestedPrice: 35000, unit: "pcs" }, // curated
  { barcode: "89910061000268", name: "Class Mild 12", category: "Rokok", suggestedPrice: 29000, unit: "pcs" }, // curated
  { barcode: "89910061000278", name: "Class Mild 16", category: "Rokok", suggestedPrice: 32000, unit: "pcs" }, // curated
  { barcode: "89910061000258", name: "Djarum Cherry 12", category: "Rokok", suggestedPrice: 30000, unit: "pcs" }, // curated
  { barcode: "89910061000228", name: "Djarum Coklat 10", category: "Rokok", suggestedPrice: 27000, unit: "pcs" }, // curated
  { barcode: "89910061000218", name: "Djarum Coklat 12", category: "Rokok", suggestedPrice: 31000, unit: "pcs" }, // curated
  { barcode: "89910061000238", name: "Djarum Super 12", category: "Rokok", suggestedPrice: 33000, unit: "pcs" }, // curated
  { barcode: "89910061000248", name: "Djarum Vanilo 12", category: "Rokok", suggestedPrice: 30000, unit: "pcs" }, // curated
  { barcode: "89910061000074", name: "Dji Sam Soe 10", category: "Rokok", suggestedPrice: 28000, unit: "pcs" }, // curated
  { barcode: "89910061000325", name: "Dunhill Fine Cut 16", category: "Rokok", suggestedPrice: 36000, unit: "pcs" }, // curated
  { barcode: "89910061000365", name: "GG Filter International 16", category: "Rokok", suggestedPrice: 32000, unit: "pcs" }, // curated
  { barcode: "8991002103436", name: "Good Day Coolin", category: "Rokok", suggestedPrice: 30000, unit: "pcs" }, // off
  { barcode: "8991002133327", name: "Good Day Duet Moca Caramel", category: "Rokok", suggestedPrice: 30000, unit: "pcs" }, // off
  { barcode: "8991002121089", name: "Good Day Original", category: "Rokok", suggestedPrice: 30000, unit: "pcs" }, // off
  { barcode: "89910061000141", name: "Gudang Garam Biru 12", category: "Rokok", suggestedPrice: 28000, unit: "pcs" }, // curated
  { barcode: "89910061000191", name: "Gudang Garam International 12", category: "Rokok", suggestedPrice: 30000, unit: "pcs" }, // curated
  { barcode: "89910061000208", name: "Gudang Garam Muli 10", category: "Rokok", suggestedPrice: 24000, unit: "pcs" }, // curated
  { barcode: "89910061000181", name: "Gudang Garam Shinten 8", category: "Rokok", suggestedPrice: 22000, unit: "pcs" }, // curated
  { barcode: "89910061000171", name: "Gudang Garam Surya Pro 16", category: "Rokok", suggestedPrice: 34000, unit: "pcs" }, // curated
  { barcode: "89910061000335", name: "LA Bold Mild 12", category: "Rokok", suggestedPrice: 28000, unit: "pcs" }, // curated
  { barcode: "89910061000355", name: "Lucky Strike 20", category: "Rokok", suggestedPrice: 34000, unit: "pcs" }, // curated
  { barcode: "89910061000315", name: "Magnum Black 16", category: "Rokok", suggestedPrice: 33000, unit: "pcs" }, // curated
  { barcode: "89910061000305", name: "Magnum White 16", category: "Rokok", suggestedPrice: 33000, unit: "pcs" }, // curated
  { barcode: "89910061000121", name: "Marlboro Black 20", category: "Rokok", suggestedPrice: 39000, unit: "pcs" }, // curated
  { barcode: "89910061000111", name: "Marlboro Mild 12", category: "Rokok", suggestedPrice: 26000, unit: "pcs" }, // curated
  { barcode: "89910061000101", name: "Marlboro Mild 20", category: "Rokok", suggestedPrice: 38000, unit: "pcs" }, // curated
  { barcode: "89910061000094", name: "Marlboro Red 12", category: "Rokok", suggestedPrice: 26000, unit: "pcs" }, // curated
  { barcode: "89910061000084", name: "Marlboro Red 20", category: "Rokok", suggestedPrice: 39000, unit: "pcs" }, // curated
  { barcode: "89910061000395", name: "Rokok Klemben 12", category: "Rokok", suggestedPrice: 14000, unit: "pcs" }, // curated
  { barcode: "89910061000385", name: "Rokok Kretek Tangan 12 (slop ecer)", category: "Rokok", suggestedPrice: 15000, unit: "pcs" }, // curated
  { barcode: "89910061000044", name: "Sampoerna Hijau Generasi 12", category: "Rokok", suggestedPrice: 31000, unit: "pcs" }, // curated
  { barcode: "89910061000054", name: "Sampoerna Premium 12", category: "Rokok", suggestedPrice: 32000, unit: "pcs" }, // curated
  { barcode: "89910061000034", name: "Sampoerna U Mild 12", category: "Rokok", suggestedPrice: 29000, unit: "pcs" }, // curated
  { barcode: "89910061000375", name: "Surya Pro Mild 16", category: "Rokok", suggestedPrice: 34000, unit: "pcs" }, // curated
  { barcode: "89910061000288", name: "X Mild 12", category: "Rokok", suggestedPrice: 29000, unit: "pcs" }, // curated
  { barcode: "89910061000298", name: "X Mild 16", category: "Rokok", suggestedPrice: 32000, unit: "pcs" }, // curated
  { barcode: "0711844162419", name: "ABC Sari Kacang Hijau", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8996001305119", name: "Arden Tender Bite Cookies Choco Splendid", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8996001355756", name: "Beng-Beng", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000423", name: "Beng-Beng Maxx 25g", category: "Snack", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "89910051000413", name: "Beng-Beng Sachet 20g", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "89910051000306", name: "Biskuat Kelapa 130g", category: "Snack", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910051000299", name: "Biskuat Oat Krunch 130g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "8886001012080", name: "Biskuit Roma Kelapa", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000881", name: "Black Oman 25g", category: "Snack", suggestedPrice: 2000, unit: "pcs" }, // curated
  { barcode: "89910051000443", name: "Boyke Cokelat 20g", category: "Snack", suggestedPrice: 2000, unit: "pcs" }, // curated
  { barcode: "89910051000463", name: "Cadbury Dairy Milk 45g", category: "Snack", suggestedPrice: 10000, unit: "pcs" }, // curated
  { barcode: "4002309037219", name: "Ceres Choco Hazelnut", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000075", name: "Cheetos Cheeza 30g", category: "Snack", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910051000055", name: "Cheetos Oz BBQ 30g", category: "Snack", suggestedPrice: 4500, unit: "pcs" }, // curated
  { barcode: "89910051000065", name: "Cheetos Oz Rakornas 30g", category: "Snack", suggestedPrice: 4500, unit: "pcs" }, // curated
  { barcode: "89910051000871", name: "Chew Ball Permen 25g", category: "Snack", suggestedPrice: 2000, unit: "pcs" }, // curated
  { barcode: "8991001503664", name: "Chic Choc Mini", category: "Snack", suggestedPrice: 1800, unit: "pcs" }, // off
  { barcode: "89910051000162", name: "Chiki Balls Ayam 20g", category: "Snack", suggestedPrice: 3500, unit: "pcs" }, // curated
  { barcode: "89910051000172", name: "Chiki Twist 10g", category: "Snack", suggestedPrice: 2000, unit: "pcs" }, // curated
  { barcode: "89910051000754", name: "Chilgo Pedas 100g", category: "Snack", suggestedPrice: 10000, unit: "pcs" }, // curated
  { barcode: "89910051000015", name: "Chitato Ayam Panggang 68g", category: "Snack", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910051000035", name: "Chitato BBQ 68g", category: "Snack", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910051000045", name: "Chitato Lite 68g", category: "Snack", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "0089686598957", name: "Chitato Rasa Keju", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "0089686598896", name: "Chitato Sapi Panggang 120gr", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8990333811119", name: "Chocopie Marshmallow", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8996001370032", name: "Choki Choki Chococashew", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000433", name: "Choki-Choki Stick 20g", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // curated
  { barcode: "8994834000218", name: "Deo Goriorio Vanilla", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000928", name: "Donat Kentang 1 pcs", category: "Snack", suggestedPrice: 3000, unit: "pcs" }, // curated
  { barcode: "89910051000132", name: "Doritos Nacho Cheese 30g", category: "Snack", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "8992775204054", name: "Garuda Kacang Atom", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000657", name: "Garuda Pilus 200g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "8992775211465", name: "Garuda Pilus Abon Sapi", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8888166989832", name: "Genji Soft Pie Biscuits", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8995102708591", name: "Gimbori Rumput Laut Kering Tabur", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8994834000331", name: "Go Potato", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8997014450421", name: "Gold Slices", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000637", name: "Kacang Atom Dua Kelinci 190g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910051000617", name: "Kacang Atom Garuda 200g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910051000627", name: "Kacang Kulit Garuda 200g", category: "Snack", suggestedPrice: 8500, unit: "pcs" }, // curated
  { barcode: "89910051000667", name: "Kacang Mede Sangrai 100g", category: "Snack", suggestedPrice: 12000, unit: "pcs" }, // curated
  { barcode: "89910051000677", name: "Kacang Mete Sangrai 100g", category: "Snack", suggestedPrice: 20000, unit: "pcs" }, // curated
  { barcode: "89910051000647", name: "Kacang Rolan 190g", category: "Snack", suggestedPrice: 7500, unit: "pcs" }, // curated
  { barcode: "89910051000714", name: "Keripik Kentang 100g", category: "Snack", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910051000697", name: "Keripik Pisang Balado 100g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910051000687", name: "Keripik Pisang Original 100g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910051000704", name: "Keripik Singkong Balado 100g", category: "Snack", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910051000734", name: "Kerupuk Putih 250g", category: "Snack", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910051000724", name: "Kerupuk Udang 250g", category: "Snack", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "8888166603554", name: "Khong Guan Biscuits 1600g", category: "Snack", suggestedPrice: 6500, unit: "pcs" }, // off
  { barcode: "89910051000473", name: "KitKat Mini 2 Finger 40g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910051000102", name: "Lays Ayam Krispi 27g", category: "Snack", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910051000122", name: "Lays Bolognese 27g", category: "Snack", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910051000112", name: "Lays Original 27g", category: "Snack", suggestedPrice: 5000, unit: "pcs" }, // curated
  { barcode: "89910051000744", name: "Maicih Keripik Level 5 75g", category: "Snack", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "8996001302620", name: "Malkist", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000493", name: "Malkist Abon 130g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910051000500", name: "Malkist Cokelat 130g", category: "Snack", suggestedPrice: 7500, unit: "pcs" }, // curated
  { barcode: "8996001301562", name: "Malkist Cokelat Kelapa", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000560", name: "Monde Butter Cookies 150g", category: "Snack", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910051000570", name: "Monde Malkist 130g", category: "Snack", suggestedPrice: 7500, unit: "pcs" }, // curated
  { barcode: "8888166994393", name: "Monde Snack Gold", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8993004789083", name: "Mr Potato Original", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8993175538572", name: "Nabati Bites Rasa Keju", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000366", name: "Nabati Richeese 130g", category: "Snack", suggestedPrice: 8500, unit: "pcs" }, // curated
  { barcode: "8993175537346", name: "Nabati Richoco", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8993175537285", name: "Nabati Wafer", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000356", name: "Nabati Wafer Cokelat 8g", category: "Snack", suggestedPrice: 1500, unit: "pcs" }, // curated
  { barcode: "89910051000346", name: "Nabati Wafer Richeese 8g", category: "Snack", suggestedPrice: 1500, unit: "pcs" }, // curated
  { barcode: "89910051000376", name: "Nextar Cokelat 120g", category: "Snack", suggestedPrice: 7500, unit: "pcs" }, // curated
  { barcode: "89910051000386", name: "Nextar Kelapa 120g", category: "Snack", suggestedPrice: 7500, unit: "pcs" }, // curated
  { barcode: "8993175548335", name: "Nextar Strawberry Cookies 106g", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8888166336568", name: "Nissin Crispy Crackers 250gr", category: "Snack", suggestedPrice: 4500, unit: "pcs" }, // off
  { barcode: "8997240600935", name: "Oatside Choco Malt 200ml", category: "Snack", suggestedPrice: 2000, unit: "pcs" }, // off
  { barcode: "89910051000209", name: "Oreo Chocolate 133g", category: "Snack", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "89910051000229", name: "Oreo Mini 35g", category: "Snack", suggestedPrice: 3500, unit: "pcs" }, // curated
  { barcode: "8992760221028", name: "Oreo Original (Vanilla)", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000831", name: "Permen Alpenliebe 55g", category: "Snack", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910051000861", name: "Permen Bolu Milko 100g", category: "Snack", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910051000801", name: "Permen Kis Electro 55g", category: "Snack", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910051000784", name: "Permen Kopiko Cappuccino 70g", category: "Snack", suggestedPrice: 4500, unit: "pcs" }, // curated
  { barcode: "89910051000774", name: "Permen Kopiko Classic 78g", category: "Snack", suggestedPrice: 4500, unit: "pcs" }, // curated
  { barcode: "89910051000794", name: "Permen Milkita 55g", category: "Snack", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910051000821", name: "Permen Mintos Roll 55g", category: "Snack", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910051000811", name: "Permen Relaxa 55g", category: "Snack", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "8888166343825", name: "Pola Snack Balado", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000590", name: "Pringles Original 52g", category: "Snack", suggestedPrice: 12000, unit: "pcs" }, // curated
  { barcode: "89910051000607", name: "Pringles Sour Cream 52g", category: "Snack", suggestedPrice: 12000, unit: "pcs" }, // curated
  { barcode: "89910051000085", name: "Qtela Singkong BBQ 40g", category: "Snack", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910051000095", name: "Qtela Tempe 40g", category: "Snack", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "0089686611236", name: "Qtela Tempe Orek", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000550", name: "Regal Cheese 200g", category: "Snack", suggestedPrice: 11000, unit: "pcs" }, // curated
  { barcode: "89910051000540", name: "Regal Klasik 200g", category: "Snack", suggestedPrice: 9000, unit: "pcs" }, // curated
  { barcode: "8996001305041", name: "Roma Biscuit Sandwich Coklat Bon Bon", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000289", name: "Roma Cream Crackers 130g", category: "Snack", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910051000279", name: "Roma Malkist Abon 130g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910051000269", name: "Roma Sandwich Cokelat 130g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910051000908", name: "Roti Sobek 250g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "89910051000918", name: "Roti Tawar Sari Roti 10 slice", category: "Snack", suggestedPrice: 13000, unit: "pcs" }, // curated
  { barcode: "8888166606395", name: "Salcheese Combo", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000520", name: "Saluut Malkist 130g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "8992775305034", name: "Saluut Malkist Sweet Cheese", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8992907952327", name: "Sandwich Cokelat", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8996001308059", name: "Sari Gandum", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000530", name: "Sari Gandum 130g", category: "Snack", suggestedPrice: 7500, unit: "pcs" }, // curated
  { barcode: "8992907952136", name: "Sari Roti Tawar Kupas", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8993004785160", name: "Smax Ring Cheese 40gr", category: "Snack", suggestedPrice: 2000, unit: "pcs" }, // off
  { barcode: "89910051000483", name: "Snickers Bar 45g", category: "Snack", suggestedPrice: 10000, unit: "pcs" }, // curated
  { barcode: "89910051000764", name: "Spicy Chiki 20g", category: "Snack", suggestedPrice: 3500, unit: "pcs" }, // curated
  { barcode: "89910051000580", name: "Sunshine Crackers 130g", category: "Snack", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910051000510", name: "Superco Malkist Cokelat 130g", category: "Snack", suggestedPrice: 8000, unit: "pcs" }, // curated
  { barcode: "8888166603431", name: "Superco Malkist Krim Cokelat", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "8991102387262", name: "Tango Vanilla Delight", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000316", name: "Tango Wafer Cokelat 130g", category: "Snack", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910051000326", name: "Tango Wafer Vanila 130g", category: "Snack", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910051000336", name: "Tango Yogurt Bluberry 130g", category: "Snack", suggestedPrice: 7000, unit: "pcs" }, // curated
  { barcode: "89910051000152", name: "Taro Net Seaweed 35g", category: "Snack", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910051000891", name: "Taro Net Seaweed 60g", category: "Snack", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910051000182", name: "Tato Sapi Panggang 30g", category: "Snack", suggestedPrice: 4000, unit: "pcs" }, // curated
  { barcode: "89910051000142", name: "Tic Tac Snack Ayam Bawang 25g", category: "Snack", suggestedPrice: 3500, unit: "pcs" }, // curated
  { barcode: "89910051000249", name: "TUC Cheese 40g", category: "Snack", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910051000239", name: "TUC Crackers BBQ 40g", category: "Snack", suggestedPrice: 6000, unit: "pcs" }, // curated
  { barcode: "89910051000403", name: "Wafello Cokelat 130g", category: "Snack", suggestedPrice: 6500, unit: "pcs" }, // curated
  { barcode: "89910051000396", name: "Wafer Coklat Cosma 8g", category: "Snack", suggestedPrice: 1000, unit: "pcs" }, // curated
  { barcode: "8996001350522", name: "Wafer Krim Cokelat", category: "Snack", suggestedPrice: 2500, unit: "pcs" }, // off
  { barcode: "89910051000841", name: "Yupi Gummy Fish 30g", category: "Snack", suggestedPrice: 3500, unit: "pcs" }, // curated
  { barcode: "89910051000851", name: "Yupi Pizza 30g", category: "Snack", suggestedPrice: 3500, unit: "pcs" }, // curated
];
