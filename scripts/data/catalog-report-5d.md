# LAPORAN MUTU KATALOG PRODUK — FASE 5D

Digenerate otomatis oleh `scripts/build-real-catalog.mjs` — SEMUA angka
di bawah dihitung dari data nyata saat build, tidak ada yang dikarang.

## Ringkasan

| Metrik | Nilai |
| --- | --- |
| Rekaman OFF diambil (CSV unduhan) | 349 |
| Barcode valid (GS1 8/12/13/14 + digit cek) | 349 |
| Barcode DITOLAK (format/digit cek/placeholder) | 0 |
| Nama produk terlalu minim | 0 |
| Di luar relevansi warung Indonesia | 9 |
| Duplikat barcode digabung (produk sama) | 78 |
| KONFLIK barcode (nama berbeda) → ditandai | 21 |
| **Produk diimpor (barcode nyata terverifikasi)** | **241** |
| — dengan harga referensi (nama+ukuran identik) | 4 |
| — tanpa harga (null — pemilik warung isi) | 237 |
| Barcode sintetis lama DIPENSIUNKAN | 509 |

Sebaran kategori: Minuman 120 · Snack 49 · Lainnya 28 · Makanan Instan 26 · Bahan Masak 18

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
   (21 kasus, tidak digabung paksa).
5. Katalog lama (715 produk, 509 barcode sintetis) dibackup di
   scripts/data/backup-5d/ dan barcode sintetisnya dipensiunkan.

## Konflik barcode (bila ada)

- `8886008101336`: "Aqua Botol Kecil" vs "Aqua Botol Kecil 330ml"
- `8991002103436`: "Good Day Coolin" vs "Good Day Coolin Coffee"
- `8992696404441`: "Bear Brand Milk Susu Steril" vs "Bear Brand Susu Steril 189ml"
- `8992696521797`: "Milo" vs "Milo 22g"
- `8992753004010`: "Fisian Flag" vs "Frisian Flag Susu Bubuk 535g"
- `8992753721597`: "Frisian Flag SKM Pouch 280" vs "Frisian Flag SKM Pouch 280g"
- `8992761002015`: "Coca Cola Btl 390ml" vs "Coca Cola Botol 390ml"
- `8992761136161`: "Coca-Cola 1 Lt" vs "Coca-Cola 1L"
- `8992770096128`: "Saori Saos Tiram" vs "Saori Saos Tiram 133ml"
- `8994588342114`: "Air Mineral" vs "Air Mineral 600ml"
- `8996129803504`: "Cleo Botol" vs "Cleo"
- `8997009510123`: "Orange Water" vs "Orange Water Drink"
- `8997009781110`: "Hydro Coco Ori" vs "Hydro Coco Original 500ml"
- `8997035600546`: "Ion Supply Drink 900ml" vs "Pocari Ion Supply Drink 900ml"
- `8997240602854`: "Creamy Classic Oat M*lk" vs "Creamy Classic Oat Milk"
- `8998009010552`: "Ultra Milk Full Cream" vs "Ultra Milk Full Cream 200ml"
- `8998009010590`: "ULTRA MILK MINI CHOCO" vs "Ultra Milk Mini Choco 125ml"
- `8998888712295`: "Del Monte BBQ" vs "Del Monte BBQ 250g"
- `8999898962694`: "Biokul Set Yog Plain" vs "Biokul Set Yogurt Plain"
- `8999999195649`: "Sari Wangi 100% Teh Asli" vs "Sari Wangi 100% Teh Asli 25s"
- `9556001288547`: "Nescafe Cappucino 220ml" vs "Nescafe Cappuccino 220ml"
