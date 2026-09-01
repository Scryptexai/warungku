# LAPORAN MUTU KATALOG PRODUK — FASE 5D

Digenerate otomatis oleh `scripts/build-real-catalog.mjs` — SEMUA angka
di bawah dihitung dari data nyata saat build, tidak ada yang dikarang.

## Ringkasan

| Metrik | Nilai |
| --- | --- |
| Rekaman OFF diambil (CSV unduhan) | 586 |
| Barcode valid (GS1 8/12/13/14 + digit cek) | 586 |
| Barcode DITOLAK (format/digit cek/placeholder) | 0 |
| Nama produk terlalu minim | 0 |
| Di luar relevansi warung Indonesia | 26 |
| Duplikat barcode digabung (produk sama) | 109 |
| KONFLIK barcode (nama berbeda) → ditandai | 36 |
| **Produk diimpor (barcode nyata terverifikasi)** | **415** |
| — dengan harga referensi (nama+ukuran identik) | 5 |
| — tanpa harga (null — pemilik warung isi) | 410 |
| Barcode sintetis lama DIPENSIUNKAN | 509 |

Sebaran kategori: Minuman 173 · Lainnya 96 · Snack 73 · Bahan Masak 36 · Makanan Instan 36 · Rokok 1

Sumber: Open Food Facts (api publik, countries=Indonesia).
Provenance per produk: field `source` + `sourceProductId` (= kode barcode OFF)
pada setiap baris katalog.

## Aturan yang dijalankan

1. REAL DATA ONLY — barcode hanya dari rekam OFF; gagal verifikasi → produk
   TIDAK masuk (tidak ada barcode cadangan/karangan).
2. Normalisasi: buang spasi/tanda format; nol depan DIPERTAHANKAN; disimpan
   sebagai string.
3. Validasi GS1: panjang 8/12/13/14 + digit cek mod-10; pola placeholder ditolak.
4. Dedup by barcode; barcode sama dengan nama beda → KONFLIK ditandai
   (36 kasus, tidak digabung paksa).
5. Katalog lama (715 produk, 509 barcode sintetis) dibackup di
   scripts/data/backup-5d/ dan barcode sintetisnya dipensiunkan.

## Konflik barcode (bila ada)

- `0089686010343`: "Indomie Soto Mie Kotak" vs "Indomie Soto Mie"
- `0089686170726`: "Mi Goreng Fried Noodles" vs "Indomie Mi Goreng 85g"
- `8886008101138`: "Aqua Botol" vs "Aqua 19L"
- `8886008101336`: "Aqua Botol Kecil" vs "Aqua Botol Kecil 330ml"
- `8990121011073`: "Bango Kecap Manis Botol" vs "Bango Kecap Manis Botol 135ml"
- `8991002103436`: "Good Day Coolin" vs "Good Day Coolin Coffee"
- `8992696404441`: "Bear Brand Milk Susu Steril" vs "Bear Brand Susu Steril 189ml"
- `8992696521797`: "Milo" vs "Milo 22g"
- `8992753004010`: "Fisian Flag" vs "Frisian Flag Susu Bubuk 535g"
- `8992753700301`: "Frisian Flag UHT Coconut 946ml" vs "FF Uht Coconut 946 Ml"
- `8992753721597`: "Frisian Flag SKM Pouch 280" vs "Frisian Flag SKM Pouch 280g"
- `8992761002015`: "Coca Cola Btl 390ml" vs "Coca Cola Botol 390ml"
- `8992761111519`: "Coca Cola Botol" vs "Coca-Cola 250ml"
- `8992761136161`: "Coca-Cola 1 Lt" vs "Coca-Cola 1L"
- `8992770033130`: "Masako Ayam Kecil Rtg" vs "Masako Ayam Kecil"
- `8992770096128`: "Saori Saos Tiram" vs "Saori Saos Tiram 133ml"
- `8993058304201`: "Bejo" vs "Tolak Angin Bejo"
- `8993175537346`: "Nabati Richoco" vs "Nabati Richoco 132g"
- `8993351124025`: "GreenFields Full Cream" vs "Green Fields Full Cream UHT"
- `8994588342114`: "Air Mineral" vs "Air Mineral 600ml"
- `8996001304990`: "Sari Gandum Susu Cokelat" vs "Roma Sari Gandum Susu & Cokelat"
- `8996001305041`: "Roma Biscuit Sandwich Coklat Bon Bon" vs "Roma Biscuit Sandwich Chocolate Coklat Bon Bon"
- `8996129803504`: "Cleo Botol" vs "Cleo"
- `8997009510123`: "Orange Water" vs "Orange Water Drink"
- `8997009781110`: "Hydro Coco Ori" vs "Hydro Coco Original 500ml"
- `8997035600546`: "Ion Supply Drink 900ml" vs "Pocari Ion Supply Drink 900ml"
- `8997240602854`: "Creamy Classic Oat M*lk" vs "Creamy Classic Oat Milk"
- `8998009010552`: "Ultra Milk Full Cream" vs "Ultra Milk Full Cream 200ml"
- `8998009010590`: "ULTRA MILK MINI CHOCO" vs "Ultra Milk Mini Choco 125ml"
- `8998866202725`: "Milku Coklat Btl 200ml" vs "Milku Coklat 200ML"
- `8998888712295`: "Del Monte BBQ" vs "Del Monte BBQ 250g"
- `8998898101416`: "Tolak Angin Cair" vs "Tolak Angin"
- `8999898962694`: "Biokul Set Yog Plain" vs "Biokul Set Yogurt Plain"
- `8999898972303`: "Biokul Greek Yogurt Strawberry" vs "Biokul Greek Yoghurt Strawberry"
- `8999999195649`: "Sari Wangi 100% Teh Asli" vs "Sari Wangi 100% Teh Asli 25s"
- `9556001288547`: "Nescafe Cappucino 220ml" vs "Nescafe Cappuccino 220ml"
