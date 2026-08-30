# Warungku — Kasir Warung Mobile-First

Aplikasi kasir (POS) dan asisten bisnis untuk warung / toko kelontong
Indonesia. Dirancang untuk pemilik warung dengan pengalaman teknis minimal:
**berjualan = scan barcode** — tunai atau bon — dan seluruh antarmuka memakai
bahasa Indonesia sehari-hari.

---

## Status: PHASE 5 — Transaction & Sales Engine ✅

| Area | Status |
| --- | --- |
| Kerangka aplikasi + navigasi bawah (tombol SCAN tengah gaya dompet digital) | ✅ Tahap 1–2 |
| Produk: daftar, cari (nama/barcode/**kategori**), tambah, edit, detail | ✅ Tahap 2–4 |
| **Baca katalog langsung dari Google Sheets (+ tombol segarkan)** | ✅ Tahap 4 |
| **Edit lengkap: nama, kategori, harga, stok, dan SATUAN** | ✅ Tahap 4 |
 | Scanner barcode kamera + pengenalan produk | ✅ Tahap 2–3 |
| **Keranjang transaksi (tambah/kurang/hapus item, total)** | ✅ Tahap 3 |
| **Pembayaran TUNAI & BON (nama pembeli wajib untuk bon)** | ✅ Tahap 3 |
| **Penyimpanan transaksi + potong stok konsisten** | ✅ Tahap 3 |
| **Google Sheets sebagai database warung (OAuth + tulis idempotent)** | ✅ Tahap 3 |
| Riwayat transaksi + bon + laporan (dari data perangkat) | ✅ |
| **Database master produk publik** (seed offline + Open Food Facts) | ✅ |
| **Impor CSV** produk massal (mis. dataset Kaggle) | ✅ |
| **Filter kategori multi-pilih + ubah harga massal (persen)** | ✅ |
| **Penyimpanan OFFLINE-FIRST** (perangkat = database utama, Sheets = cadangan) | ✅ |
| **PWA** — aplikasi bisa dipasang & dibuka tanpa internet | ✅ |
| AI agent / business intelligence | ⏳ Tahap 6 (menunggu instruksi) |
| Mock data & pengujian menyeluruh | ⏳ Tahap 7 |
| Hardening produksi & deployment | ⏳ Tahap 8 |

Alur yang sudah berjalan end-to-end:

```
BUKA APLIKASI → SCAN BARCODE  (berlapis, offline dulu)
  ├─ ada di KATALOG WARUNG (perangkat) → ATUR JUMLAH → TAMBAH KE TRANSAKSI
  ├─ ada di MASTER BAWAAN (offline, ±100 produk) → HARGA & KATEGORI REKOMENDASI
  │     terisi otomatis → "TAMBAHKAN KE WARUNG SAYA" → cek harga & stok → SIMPAN
  ├─ ada di OPEN FOOD FACTS (online, 2jt+ produk) → idem, tanpa harga rekomendasi
  └─ belum ada di mana pun → "PRODUK BELUM TERDAFTAR" → TAMBAH PRODUK (barcode terisi)
        → BAYAR → TUNAI / BON (→ NAMA PEMBELI) → KONFIRMASI → SIMPAN
        → TERSIMPAN DI PERANGKAT (utama) → STOK BERKURANG
        → CADANGAN KE GOOGLE SHEETS otomatis saat online → TRANSAKSI BARU
```

---


### Performa navigasi

- **Cache katalog sesi** (`CatalogProvider`): produk/pelanggan/profil dimuat
  SEKALI per sesi lalu dipegang di memori — pindah menu tidak memuat ulang
  apa pun (tanpa kedipan skeleton).
- **Google Sheets di belakang, dibatasi TTL 60 detik** — bukan di-setiap
  kunjungan; tombol segarkan tetap tersedia untuk memaksa muat ulang.
- **Prefetch saat senggang**: semua menu utama di-prefetch dan pustaka
  scanner (ZXing) di-pramuat saat idle, sehingga membuka SCAN instan.
- Semua halaman di-prerender statis (cache HIT, ~beberapa ms).
- Catatan: mode `npm run dev` mengompilasi tiap halaman saat dikunjungi —
  untuk merasakan kecepatan penuh gunakan `npm run build && npm run start`.

### Navigasi & kamera

- **Navigasi bawah**: tombol **SCAN besar di tengah** (aksi utama aplikasi,
  gaya aplikasi dompet digital), diapit Beranda · Transaksi (kiri) dan
  Laporan · AI (kanan). Produk diakses dari pintasan Beranda. Layar scan
  tampil penuh tanpa navigasi.
- **Kamera**: status izin dicek lewat `navigator.permissions` — bila belum
  pernah ditanya, popup izin browser muncul saat scanner dibuka. Bila izin
  pernah DITOLAK (browser tidak menampilkan popup lagi), aplikasi
  mengarahkan ke ikon 🔒 dan **kamera menyala otomatis** begitu diizinkan.
  Kasus lain (bingkai pratinjau, kamera dipakai aplikasi lain, kamera tidak
  ada, HTTP tidak aman) didiagnosis spesifik + tombol **Buka di Tab Baru**.
  Kode manual selalu tersedia sebagai jalur cadangan.

### Database master produk publik (gratis)

Scan yang tidak menemukan produk di katalog warung TIDAK berhenti —

1. **Master bawaan (offline)** — `src/data/master/master-products.ts`:
   ±100 produk warung umum (mi instan, minuman, rokok, bahan masak, dll.)
   dengan kategori & harga rekomendasi. **Catatan jujur**: barcode-nya
   adalah TEMPLATE EAN-13 ber-digit-cek valid, BUKAN nomor terdaftar
   resmi — katalog nyata datang dari impor CSV atau Open Food Facts.
2. **Open Food Facts (online)** — `src/services/openfoodfacts.service.ts`:
   lookup `world.openfoodfacts.org` (API publik gratis, tanpa kunci).
   Nama & kategori dipetakan ke kategori warung; **OFF tidak punya harga**,
   jadi harga diisi sendiri. Offline/timeout → diam (fallback form manual).
3. **Impor CSV milik sendiri** — menu **Produk → Impor**: format fleksibel
   (pemisah `,` `;` tab; kolom Indonesia/Inggris: barcode/nama/kategori/
   harga/stok/satuan), pratinjau dulu, barcode ganda dilewati otomatis,
   laporan hasil (berhasil / dilewati / gagal). Tombol **Contoh CSV**
   menyediakan templat. Cocok untuk dataset produk Indonesia dari Kaggle.

### Fitur efisiensi warung

- **Filter kategori multi-pilih** di daftar Produk (cth. tampilkan
  "Makanan Instan" + "Minuman" sekaligus).
- **Ubah harga massal**: mode Pilih → centang produk (atau "pilih semua") →
  naik/turunkan sekian persen (preset 5/10/15/25% atau bebas) → pratinjau
  contoh harga lama → baru → konfirmasi eksplisit → semua harga berubah
  sekaligus (dibulatkan ke ratusan rupiah). Transaksi LAMA tetap menyimpan
  harga saat transaksi terjadi (snapshot) — tidak ikut berubah.

### Penyimpanan OFFLINE-FIRST (rework arsitektur data)

**Database utama = PERANGKAT (localStorage via `LocalStore`)**. Google
Sheets diturunkan menjadi CADANGAN milik warung:

- Tulis (scan/produk/transaksi) → simpan perangkat dulu dengan
  `sync_status` PENDING → antre → kirim ke Sheets saat online
  (otomatis via event `online`, atau tombol **Sinkronkan** di Beranda)
  → ditandai SYNCED, **tidak dihapus dari perangkat**.
- Baca (produk, riwayat transaksi, bon, laporan, ringkasan Beranda) →
  SELALU dari perangkat → instan & tanpa internet. Riwayat Transaksi,
  Laporan (omzet/jumlah/bon/produk terlaris/grafik 7 hari), dan Bon kini
  layar sungguhan — bukan lagi kerangka.
- **Tarik pertama kali online**: produk + pelanggan + transaksi dari Sheets
  di-merge ke perangkat (by ID; transaksi lokal yang masih PENDING selalu
  menang agar tidak tertimpa).
- **Konflik/gagal kirim** → kartu Sinkronisasi Beranda menampilkan pesan
  Indonesia sederhana; data tetap aman di antrean & dicoba ulang otomatis.
- **Migrasi**: koleksi lama `pendingTransactions` dipindah otomatis ke
  koleksi `transactions` saat pertama dibuka — tidak ada data hilang.

### PWA — dipasang & dibuka offline

`manifest.webmanifest` (nama, ikon 192/512 + maskable, shortcut Scan &
Produk) + service worker (`public/sw.js`): aset statis Next (ber-hash)
cache-first; halaman network-first dengan cadangan cache; Beranda
di-precache. Setelah sekali dibuka online, aplikasi bisa dibuka tanpa
internet (butuh HTTPS — `npm start` di localhost juga diizinkan).

## 1. Tujuan Produk

Aplikasi kasir untuk warung kecil dengan perangkat utama **smartphone**.
Prioritas: familiar (pola dompet digital), sederhana, cepat, jelas, target
sentuh besar, sedikit ketukan.

Prinsip inti:

> **Pemilik warung cukup mendaftarkan produk SEKALI.** Setelah itu, scan
> barcode-nya langsung mengenali produk. Harga boleh berubah kapan saja —
> transaksi lama tetap menyimpan harga saat itu terjadi.

## 2. Model Data

Didefinisikan di `src/domain` (murni TypeScript, tanpa framework):

| Entitas | Field inti |
| --- | --- |
| `Product` | id, barcode (unik), nama, kategori, harga, stok, satuan, aktif, created/updated |
| `Transaction` | id, waktu, paymentType (CASH/BON), customer (nama+id), total, status, items |
| `TransactionItem` | transactionId, **barcode (snapshot)**, nama (snapshot), qty, unit_price (snapshot), subtotal |
| `Customer` | id, nama, telepon, saldo bon |

**Harga historis:** setiap transaksi menyimpan snapshot `unit_price` saat
terjadi. Mengubah harga produk TIDAK mengubah transaksi lama — laporan
historis tetap akurat.

**Stok:** `stok − terjual = stok baru`, dipotong otomatis saat transaksi
disimpan, konsisten lokal maupun di Sheets.

## 3. GOOGLE SHEETS = CADANGAN DATA WARUNG

Google Sheets milik pemilik warung adalah sumber data utama. Tidak ada
database transaksi di server aplikasi.

Struktur spreadsheet (dibuat otomatis saat koneksi, lihat
`src/data/google/sheets-schema.ts`):

| Tab | Kolom |
| --- | --- |
| `PRODUCTS` | product_id, barcode, product_name, category, selling_price, stock, unit, created_at, updated_at, active |
| `TRANSACTIONS` | transaction_id, date, time, payment_type, customer_name, total_amount |
| `TRANSACTION_ITEMS` | transaction_id, product_id, barcode, product_name, quantity, unit_price, subtotal |
| `CUSTOMERS` | customer_id, customer_name, total_transactions, total_debt, last_transaction |

Struktur ini siap dipakai fase berikutnya: laporan harian/mingguan/bulanan,
pencarian transaksi/pelanggan, analisis produk, dan AI agent.

### Cara menghubungkan (sekali per warung)

1. **Siapkan kredensial Google** (sekali, di server):
   - Buat proyek di [Google Cloud Console](https://console.cloud.google.com),
     aktifkan **Google Sheets API** + **Google Drive API**.
   - OAuth consent screen → tambahkan diri Anda sebagai test user.
   - Buat **OAuth Client ID** tipe *Web application* dengan Authorized
     redirect URI: `{NEXT_PUBLIC_APP_URL}/api/auth/google/callback`.
   - Salin `.env.example` → `.env.local`, isi `GOOGLE_CLIENT_ID`,
     `GOOGLE_CLIENT_SECRET`, dan `GOOGLE_TOKEN_ENCRYPTION_KEY` (≥32 char).
2. **Di aplikasi**: menu **Profil → Data & Google Sheets → Sambungkan
   Google** → login akun Google warung → izinkan. Spreadsheet
   `Warungku — {nama warung}` dibuat otomatis (atau dipakai ulang bila sudah
   ada), lalu seluruh data lokal langsung dikirim.
3. Selesai — setiap transaksi/produk/bon tersimpan di perangkat DAN
   otomatis dicadangkan ke spreadsheet saat online.

### Arsitektur koneksi & keamanan

```
BROWSER WARUNG                        SERVER (Next.js API)         GOOGLE
──────────────────────────            ─────────────────────        ─────────
LocalStore (DATABASE UTAMA)
  └ antrean sync (QueueSyncEngine) ──► /api/sheets/request ──► Sheets API
Sambungkan Google                ──► /api/auth/google/*    ──► OAuth 2.0
     (tarik balik: Sheets ──► merge by ID ──► perangkat, saat online)
```

- Token OAuth disimpan **terenkripsi AES-256-GCM** di cookie httpOnly milik
  perangkat warung — bukan di localStorage, bukan di database server.
- Klien tidak pernah memegang token; semua panggilan Google melewati proksi
  server dengan allowlist host/path.
- **Idempotent**: pengiriman ulang (retry/double-submit) tidak menduplikasi
  baris — penulisan dicari dulu berdasarkan ID-nya (transaction_id/barcode/
  customer). Double-tap tombol simpan juga dicegah di UI (state `saving`).

### Jujur soal status (offline-first)

Transaksi SELALU disimpan dulu di perangkat (`sync_status` = PENDING), lalu
dicadangkan ke Sheets:

- Berhasil → **“✓ Transaksi berhasil disimpan”** (perangkat) dan antrean
  kosong → ditandai SYNCED (tetap ada di riwayat perangkat).
- Google tidak terjangkau → **“Transaksi belum tersimpan — periksa koneksi
  dan coba lagi”** + tombol **Coba Kirim Lagi**; data aman di perangkat dan
  terkirim otomatis saat koneksi kembali (event `online`).

## 4. Teknologi

| Teknologi | Peran |
| --- | --- |
| [Next.js 15](https://nextjs.org) (App Router) | Aplikasi + API routes (OAuth & proksi Sheets) |
| [React 19](https://react.dev) | UI |
| [TypeScript 5](https://www.typescriptlang.org) (strict) | Kontrak data |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling mobile-first |
| [@zxing/browser](https://github.com/zxing-js/browser) | Scanner barcode kamera (EAN/UPC/Code128/39/ITF) |
| Google Sheets API + OAuth 2.0 | Database milik warung |

## 5. Menjalankan Secara Lokal

```bash
npm install
cp .env.example .env.local   # isi GOOGLE_* bila ingin koneksi Sheets
npm run dev                   # http://localhost:3000
```

| Skrip | Fungsi |
| --- | --- |
| `npm run dev` / `build` / `start` | pengembangan / build / produksi |
| `npm run lint` | ESLint seluruh proyek |
| `npm run typecheck` | Validasi TypeScript |
| `npm run smoke` | Uji asap 27 pemeriksaan (antrean, produk, alur tunai/bon → “Sheets” palsu di memori) |

> Kamera memerlukan HTTPS atau localhost. Bila kamera tidak tersedia, layar
> scan menyediakan **masuk kode manual** dengan alur yang sama persis.

## 6. Struktur Proyek

```
warungku/
├── .env.example                # Konfigurasi environment (tanpa kredensial)
├── public/                     # PWA: manifest.webmanifest, sw.js, icons/
├── scripts/smoke-sync.ts       # Uji asap lintas lapisan (41 pemeriksaan)
└── src/
    ├── app/
    │   ├── page.tsx                    # BERANDA (dompet digital + kartu sinkron)
    │   ├── scan/                       # SCAN: kamera → qty → keranjang → bayar
    │   ├── produk/                     # produk: daftar/cari/tambah/detail/edit
    │   │   └── impor/                  # IMPOR CSV produk massal
    │   ├── transaksi/                  # riwayat transaksi + bon (data perangkat)
    │   ├── laporan/                    # omzet, terlaris, grafik 7 hari
    │   ├── profil/                     # profil + KONEKSI GOOGLE SHEETS
    │   └── api/
    │       ├── auth/google/{start,callback,status,disconnect}/
    │       ├── sheets/{request,setup}/ # proksi Google + siap spreadsheet
    │       └── health/
    ├── components/
    │   ├── scan/          # ScanScreen, ScannerView, ScanResultSheet (+qty),
    │   │                  # CartBar, PaymentSheet (TUNAI/BON), SaleResultSheet
    │   ├── products/      # ProductsScreen (multi-pilih + harga massal),
    │   │                  # ProductForm, Detail, Edit, ImportProductsScreen
    │   ├── transactions/  # TransactionsScreen + bon detail (offline)
    │   ├── reports/       # ReportsScreen (agregasi lokal)
    │   ├── home/          # header, ringkasan, ScanHero, aktivitas, SyncCard
    │   ├── pwa/           # ServiceWorkerRegistrar (pasang SW)
    │   ├── profile/ layout/ providers/ (App + Catalog) ui/
    ├── services/
    │   ├── sale.service.ts        # ORKESTRATOR: harga terbaru, stok, bon, sync
    │   ├── product.service.ts     # + bulkCreateProducts, bulkUpdatePrices
    │   ├── transaction.service.ts # offline-first + pullFromSheets (merge)
    │   ├── openfoodfacts.service.ts  customer.service.ts  store-profile.service.ts
    │   └── sync.service.ts  container.ts (DI root)
    ├── domain/             # model data murni (Product, Transaction, dst.)
    ├── data/
    │   ├── google/         # sheets-schema, sheets-io, HttpGoogleApiClient,
    │   │                   # GoogleSheetsSyncTarget (tulis idempotent)
    │   ├── local/          # LocalStore (localStorage/memori) — DATABASE UTAMA
    │   └── master/         # master-products.ts (seed offline ±100 produk)
    ├── sync/               # QueueSyncEngine (antrean + onOperationSynced)
    ├── auth/               # AuthProvider + GoogleAuthProvider (klien)
    ├── lib/                # csv (impor), pricing (harga massal), reports
    │                       # (agregasi), crypto, google-oauth, auth-session,
    │                       # errors, id, input, money, datetime, cn
    └── config/ types/      # konfigurasi, env, nav; tipe bersama
```

## 7. Arsitektur Sinkronisasi

```
OPERASI LOKAL → LOCALSTORE = DATABASE UTAMA (sync_status PENDING)
                                    │
                       ANTREAN SYNC → GOOGLE SHEETS (CADANGAN) → SUKSES
                                    │         ↳ entitas ditandai SYNCED
                                    ↘ GAGAL JARINGAN → TETAP DI ANTREAN
                                      → DICOBA LAGI OTOMATIS SAAT ONLINE
SAAT ONLINE (pertama / Sinkronkan) → SHEETS ditarik → MERGE by ID → PERANGKAT
```

- Sesi sinkronisasi diserialisasi (promise chain) — ringkasan yang
  dikembalikan selalu mencerminkan antrean sampai titik waktu pemanggilan.
- Pemulihan crash: item `IN_PROGRESS` dikembalikan ke `PENDING` saat init.
- Batas per sesi: 50 operasi (`DEFAULT_MAX_SYNC_OPERATIONS_PER_RUN`).

## 8. Konfigurasi Environment

Lihat `.env.example` (dokumentasi lengkap di dalam file).

| Variabel | Lingkup | Dipakai |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` / `_ENV` / `_URL` / `_CURRENCY` / `_LOCALE` / `_TIMEZONE` | publik | Tahap 1 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | server | Tahap 3 (koneksi Sheets) |
| `GOOGLE_OAUTH_REDIRECT_URI` | server | opsional — default `{APP_URL}/api/auth/google/callback` |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` (≥32 char) | server | Tahap 3 (enkripsi cookie token) |
| `NEXT_PUBLIC_ENABLE_MOCK_DATA` | publik | Tahap 8 |

## 9. Roadmap

1. **PHASE 1 — Foundation & project setup** ✅
2. **PHASE 2 — Mobile UI / e-wallet style + produk & barcode** ✅
3. **PHASE 3 — Core transaction & barcode workflow** ✅
4. **PHASE 4 — Product catalog & barcode engine** ✅
5. **PHASE 5 — Transaction & sales engine** ✅ *(saat ini)*
5. PHASE 5 — Inventory & product management
6. PHASE 6 — AI agent / business intelligence
7. PHASE 7 — Mock data & full system testing
8. PHASE 8 — Production hardening & deployment

### Catatan khusus Tahap 5 (mesin transaksi)

- **Konfirmasi eksplisit**: TOTAL → TUNAI/BON → (BON: cari/pilih pelanggan
  dengan total bon) → layar KONFIRMASI (pembayaran, pelanggan, jumlah
  produk, rincian item) → **SIMPAN TRANSAKSI**. Transaksi tidak pernah
  tersimpan otomatis setelah scan.
- **Pencarian pelanggan BON**: ketik nama → saran pelanggan lama (nama +
  total bon) muncul; pilih yang lama atau langsung pakai nama baru.
- **Pintu masuk transaksi**: scan barcode, kode manual, ATAU cari produk
  (nama/barcode/kategori) langsung dari layar transaksi.
- **Stok aman**: kecukupan stok divalidasi SEBELUM menyimpan; transaksi
  yang gagal tersimpan tidak pernah mengurangi stok.
- **product_id** menjadi hub antara TRANSACTIONS dan TRANSACTION_ITEMS.

### Catatan khusus Tahap 4 (katalog & barcode)

- **Baca dari Sheets**: layar Produk menarik katalog terbaru langsung dari
  spreadsheet toko saat dibuka (dan lewat tombol segarkan); kegagalan baca
  → menampilkan data perangkat + pesan sederhana. Perangkat baru pun bisa
  memulihkan katalog dari Google Sheets.
- **product_id & barcode stabil**: mengubah harga/stok/satuan TIDAK membuat
  id atau barcode baru; transaksi lama tetap menyimpan harga saat terjadi.
- **Pencarian**: nama, barcode, ATAU kategori — hasil menampilkan nama,
  harga, dan stok lebih dulu.

## 10. Lanjut ke fase berikutnya

Modul berikutnya (pencarian/pelaporan lanjutan, lalu AI) tinggal MEMBACA
spreadsheet warung lewat jalur yang sudah ada (`HttpGoogleApiClient` →
proksi): riwayat transaksi di tab `TRANSACTIONS`/`TRANSACTION_ITEMS`,
daftar bon di `CUSTOMERS`, agregat harian dari kolom date/total — tanpa
perubahan arsitektur.
