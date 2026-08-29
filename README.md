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
| Pencarian, customer/bon & laporan | ⏳ Tahap 4 |
| Manajemen inventori & produk lanjutan | ⏳ Tahap 5 |
| AI agent / business intelligence | ⏳ Tahap 6 |
| Mock data & pengujian menyeluruh | ⏳ Tahap 7 |
| Hardening produksi & deployment | ⏳ Tahap 8 |

Alur yang sudah berjalan end-to-end:

```
BUKA APLIKASI → SCAN BARCODE
  ├─ produk dikenal  → ATUR JUMLAH → TAMBAH KE TRANSAKSI → SCAN LAGI…
  │     → BAYAR → TUNAI / BON (→ NAMA PEMBELI) → SIMPAN
  │     → TERSIMPAN KE GOOGLE SHEETS → STOK BERKURANG → TRANSAKSI BARU
  └─ produk belum ada → "PRODUK BELUM TERDAFTAR" → TAMBAH PRODUK
        (barcode terisi + satuan) → SIMPAN → KEMBALI KE TRANSAKSI → JUALAN
```

---


### Navigasi & kamera

- **Navigasi bawah**: tombol **SCAN besar di tengah** (aksi utama aplikasi,
  gaya aplikasi dompet digital), diapit Beranda · Transaksi (kiri) dan
  Laporan · AI (kanan). Produk diakses dari pintasan Beranda. Layar scan
  tampil penuh tanpa navigasi.
- **Kamera**: bila kamera diblokir (mis. dibuka dalam bingkai pratinjau),
  aplikasi menampilkan penyebab spesifik + tombol **Buka di Tab Baru** —
  di tab penuh, izin kamera bisa diberikan dan scanner menyala normal.
  Kode manual selalu tersedia sebagai jalur cadangan.

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

## 3. GOOGLE SHEETS = DATABASE WARUNG

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
3. Selesai — setiap transaksi/produk/bon otomatis masuk ke spreadsheet.

### Arsitektur koneksi & keamanan

```
BROWSER WARUNG                        SERVER (Next.js API)         GOOGLE
──────────────────────────            ─────────────────────        ─────────
Transaksi → LocalStore (dulu!)  ──►   /api/sheets/request   ──►   Sheets API
Antrean sync (QueueSyncEngine)        (proksi + token)             Drive API
Sambungkan Google              ──►   /api/auth/google/*     ──►   OAuth 2.0
```

- Token OAuth disimpan **terenkripsi AES-256-GCM** di cookie httpOnly milik
  perangkat warung — bukan di localStorage, bukan di database server.
- Klien tidak pernah memegang token; semua panggilan Google melewati proksi
  server dengan allowlist host/path.
- **Idempotent**: pengiriman ulang (retry/double-submit) tidak menduplikasi
  baris — penulisan dicari dulu berdasarkan ID-nya (transaction_id/barcode/
  customer). Double-tap tombol simpan juga dicegah di UI (state `saving`).

### Jujur soal status (offline-first)

Transaksi SELALU disimpan dulu di perangkat, lalu dikirim ke Sheets:

- Berhasil → **“✓ Transaksi berhasil disimpan”**.
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
├── scripts/smoke-sync.ts       # Uji asap lintas lapisan
└── src/
    ├── app/
    │   ├── page.tsx                    # BERANDA (dompet digital)
    │   ├── scan/                       # SCAN: kamera → qty → keranjang → bayar
    │   ├── produk/                     # produk: daftar/cari/tambah/detail/edit
    │   ├── transaksi/ laporan/ ai/     # tujuan fase berikutnya (Tahap 4/6)
    │   ├── profil/                     # profil + KONEKSI GOOGLE SHEETS
    │   └── api/
    │       ├── auth/google/{start,callback,status,disconnect}/
    │       ├── sheets/{request,setup}/ # proksi Google + siap spreadsheet
    │       └── health/
    ├── components/
    │   ├── scan/          # ScanScreen, ScannerView, ScanResultSheet (+qty),
    │   │                  # CartBar, PaymentSheet (TUNAI/BON), SaleResultSheet
    │   ├── products/      # ProductsScreen, ProductForm (+satuan), Detail, Edit
    │   ├── profile/       # ProfileForm, GoogleSheetsCard (koneksi)
    │   ├── home/ layout/ providers/ (App + Cart) ui/
    ├── services/
    │   ├── sale.service.ts        # ORKESTRATOR: harga terbaru, stok, bon, sync
    │   ├── product.service.ts  customer.service.ts  transaction.service.ts
    │   ├── store-profile.service.ts  sync.service.ts  container.ts (DI root)
    ├── domain/             # model data murni (Product, Transaction, dst.)
    ├── data/
    │   ├── google/         # sheets-schema, sheets-io, HttpGoogleApiClient,
    │   │                   # GoogleSheetsSyncTarget (tulis idempotent)
    │   └── local/          # LocalStore (localStorage/memori)
    ├── sync/               # QueueSyncEngine (antrean offline-first)
    ├── auth/               # AuthProvider + GoogleAuthProvider (klien)
    ├── lib/                # crypto (AES-GCM), google-oauth, auth-session,
    │                       # errors, id, input, money, datetime, cn
    └── config/ types/      # konfigurasi, env, nav; tipe bersama
```

## 7. Arsitektur Sinkronisasi

```
OPERASI LOKAL → LOCALSTORE (dulu) → ANTREAN SYNC → GOOGLE SHEETS → SUKSES
                                    ↘ GAGAL JARINGAN → TETAP DI ANTREAN
                                      → DICOBA LAGI OTOMATIS SAAT ONLINE
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
