# Warungku — Kasir Warung Mobile-First

Aplikasi kasir (POS) dan asisten bisnis untuk warung / toko kelontong
Indonesia. Dirancang untuk pemilik warung dengan pengalaman teknis minimal:
**satunya cara berjualan adalah scan barcode** — tunai atau bon — dan seluruh
antarmuka memakai bahasa Indonesia sehari-hari.

---

## Status: PHASE 2 — Product Database & Barcode System ✅

| Area | Status |
| --- | --- |
| Kerangka aplikasi + navigasi bawah (5 tab) | ✅ Tahap 1 |
| Beranda gaya dompet digital + aksi utama **Scan** | ✅ Tahap 1 |
| Daftar produk + kartu produk seluler | ✅ Tahap 2 |
| Pencarian produk (nama & barcode) | ✅ Tahap 2 |
| Tambah produk (form sederhana) | ✅ Tahap 2 |
| Edit produk (nama, kategori, harga, stok) | ✅ Tahap 2 |
| Detail produk | ✅ Tahap 2 |
| Scanner barcode kamera (ZXing) | ✅ Tahap 2 |
| Barcode → produk dikenali / daftar baru | ✅ Tahap 2 |
| Proteksi barcode ganda | ✅ Tahap 2 |
| Transaksi, Tunai & Bon | ⏳ Tahap 3 |
| Google Sheets Database & Sinkronisasi | ⏳ Tahap 4 |
| Dashboard, Laporan & Pencarian | ⏳ Tahap 5 |
| Asisten AI | ⏳ Tahap 6 |
| Integrasi & kesiapan produksi | ⏳ Tahap 7 |
| Uji mock-data end-to-end | ⏳ Tahap 8 |

---

## 1. Tujuan Produk

Aplikasi kasir untuk warung kecil dengan perangkat utama **smartphone**.
Pengguna adalah pemilik atau penjaga warung. Prioritas desain: familiar
(pola dompet digital), sederhana, cepat, jelas, dan target sentuh besar.

Prinsip inti Tahap 2:

> **Pemilik warung cukup mendaftarkan produk SEKALI.**
> Setelah itu, scan barcode-nya langsung mengenali produk tersebut.

Alur inti produk:

```
BUKA APLIKASI → SCAN BARCODE
  ├─ barcode sudah ada   → PRODUK DIKENALI (nama, harga, stok)
  └─ barcode belum ada   → "PRODUK BELUM TERDAFTAR" → TAMBAH PRODUK
                           (barcode sudah terisi otomatis)
```

Tahap 2 berakhir di identifikasi/pendaftaran produk — pencatatan transaksi
menyusul di Tahap 3.

## 2. Referensi UX — Pola Dompet Digital

Acukan UX adalah aplikasi dompet digital Indonesia yang sudah akrab
(DANA, GoPay, OVO, dsb.) — **pola interaksinya**, bukan aset mereknya.
Beranda memakai hierarki: header profil warung → ringkasan hari ini →
tombol **Scan Barang** yang dominan → kisi pintasan ikon → aktivitas
terakhir → navigasi bawah 5 tab (Beranda · Transaksi · Produk · Laporan · AI).

Layar produk mengikuti pola yang sama: bilah pencarian besar di atas,
kartu baris produk (nama, harga, stok, barcode), ketuk → detail → edit.

## 3. Teknologi

| Teknologi | Peran |
| --- | --- |
| [Next.js 15](https://nextjs.org) (App Router) | Kerangka aplikasi + API routes |
| [React 19](https://react.dev) | UI |
| [TypeScript 5](https://www.typescriptlang.org) (strict) | Kontrak data & keamanan tipe |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling mobile-first |
| [ESLint 9](https://eslint.org) | Kualitas kode |
| [@zxing/browser](https://github.com/zxing-js/browser) + `@zxing/library` | Pemindaian barcode via kamera (EAN-13/8, UPC, Code128/39, ITF) |
| Google Sheets API + OAuth | Basis data milik warung (mulai **Tahap 4**) |

## 4. Menjalankan Secara Lokal

Prasyarat: Node.js ≥ 20.

```bash
npm install
npm run dev        # http://localhost:3000
```

Mode produksi:

```bash
npm run build
npm run start
```

| Skrip | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan (0.0.0.0:3000) |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build |
| `npm run lint` | ESLint seluruh proyek |
| `npm run typecheck` | Validasi TypeScript (`tsc --noEmit`) |
| `npm run smoke` | Uji asap arsitektur + logika produk (lihat `scripts/smoke-sync.ts`) |

> Catatan: pemindaian kamera memerlukan konteks aman (HTTPS atau localhost)
> dan izin kamera. Bila kamera tidak tersedia, layar scan menyediakan
> **masukkan kode manual** dengan alur hasil yang sama persis.

## 5. Konfigurasi Environment

Tidak ada kredensial di kode sumber — semuanya lewat environment variable.
Lihat `.env.example` (dokumentasi lengkap di dalam file tersebut).

| Variabel | Lingkup | Default | Dipakai mulai |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | publik | `Warungku` | Tahap 1 |
| `NEXT_PUBLIC_APP_ENV` | publik | `development` | Tahap 1 |
| `NEXT_PUBLIC_APP_URL` | publik | `http://localhost:3000` | Tahap 1 |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` / `…_LOCALE` / `…_TIMEZONE` | publik | `IDR` / `id-ID` / `Asia/Jakarta` | Tahap 1 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | server | — | Tahap 4 |
| `GOOGLE_OAUTH_REDIRECT_URI` | server | turunan `APP_URL` | Tahap 4 |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | server | — | Tahap 4 |
| `NEXT_PUBLIC_ENABLE_MOCK_DATA` | publik | `false` | Tahap 8 |

## 6. Struktur Proyek

```
warungku/
├── .env.example                # Dokumentasi environment (tanpa kredensial)
├── scripts/smoke-sync.ts       # Uji asap arsitektur + logika produk
└── src/
    ├── app/                    # UI — routes App Router
    │   ├── layout.tsx          #   Cangkang aplikasi + metadata
    │   ├── page.tsx            #   BERANDA (gaya dompet digital)
    │   ├── scan/               #   LAYAR SCAN — scanner kamera + hasil scan
    │   ├── transaksi/          #   Transaksi  (fungsi penuh di Tahap 3)
    │   ├── produk/
    │   │   ├── page.tsx        #     DAFTAR produk + pencarian
    │   │   ├── tambah/         #     TAMBAH produk (prefill barcode dari scan)
    │   │   └── [id]/
    │   │       ├── page.tsx    #     DETAIL produk
    │   │       └── ubah/       #     EDIT produk (nama/kategori/harga/stok)
    │   ├── laporan/            #   Laporan    (fungsi penuh di Tahap 5)
    │   ├── ai/                 #   Asisten AI (fungsi penuh di Tahap 6)
    │   ├── profil/             #   Profil warung (lokal) + info Google Sheets
    │   └── api/health/         #   Health check API
    ├── components/
    │   ├── layout/             #   AppShell, BottomNav (5 tab)
    │   ├── home/               #   HomeHeader, TodaySummaryCard, ScanHero,
    │   │                       #   QuickAccess, RecentActivity
    │   ├── products/           #   ProductsScreen, ProductForm, ProductRow,
    │   │                       #   ProductDetailScreen, Add/EditProductScreen
    │   ├── scan/               #   ScanScreen, ScannerView (kamera ZXing),
    │   │                       #   ScanResultSheet
    │   ├── transactions/       #   TransactionsScreen (kerangka Tahap 3)
    │   ├── reports/            #   ReportsScreen (kerangka Tahap 5)
    │   ├── profile/            #   ProfileForm
    │   ├── providers/          #   AppProviders (composition root → React)
    │   └── ui/                 #   Primitif: Button, LinkButton, EmptyState,
    │                           #   PageHeader, SectionCard, PhaseNotice, ikon
    ├── services/               # LOGIKA APLIKASI (use case)
    │   ├── product.service.ts  #   ✅ dipakai penuh di Tahap 2
    │   │                       #   (tambah/edit/cari/lookup barcode/anti-duplikat)
    │   ├── store-profile.service.ts
    │   ├── customer.service.ts       # (persiapan Tahap 3 — bon)
    │   ├── transaction.service.ts    # (persiapan Tahap 3)
    │   ├── sync.service.ts           # (persiapan Tahap 4)
    │   ├── local-data.service.ts
    │   └── container.ts        #   Composition root (DI)
    ├── domain/                 # MODEL DOMAIN — murni, tanpa framework
    │   ├── store.ts  product.ts  customer.ts  transaction.ts
    │   ├── inventory.ts  price-history.ts  reports.ts  sync.ts
    │   └── index.ts
    ├── data/                   # LAPISAN AKSES DATA
    │   ├── store-data-repository.ts   # Kontrak akses data warung (port)
    │   ├── google/             #   Terisolasi: klien API + skema Sheets (Tahap 4)
    │   └── local/              #   LocalStore: localStorage / memori
    ├── sync/                   # SINKRONISASI (arsitektur; implementasi Tahap 4)
    ├── auth/                   # AUTENTIKASI (kontrak; implementasi Tahap 4)
    ├── types/                  # Tipe bersama (ISODateTime, amplop API)
    ├── lib/                    # Utilitas (errors, id, input, money, datetime, cn)
    └── config/                 # app.ts, env.ts, nav.ts
```

## 7. Model Produk

Didefinisikan di `src/domain/product.ts`, tersimpan lokal via `LocalStore`
(`products`), dan setiap perubahan juga menghasilkan operasi
`PRODUCT:CREATE/UPDATE` pada antrean sinkronisasi — siap dipetakan ke
Google Sheets pada Tahap 4 tanpa mengubah UI.

| Field | Jenis | Keterangan |
| --- | --- | --- |
| `id` | string | ID unik (`prd_…`) |
| `barcode` | string | **Unik satu produk** — kunci pengenalan scan |
| `name` | string | Nama produk |
| `category` | string | Kategori (cth. Makanan, Minuman) |
| `currentPrice` | number | Harga jual saat ini (rupiah bulat) — mudah diubah |
| `stock` | number | Stok saat ini (pengurangan otomatis menyusul di Tahap 3) |
| `isActive` | boolean | Status produk |
| `createdAt` / `updatedAt` | ISODateTime | Dibuat / terakhir diubah |

Aturan yang dijaga oleh `ProductService`:

- **Satu barcode = satu produk.** Mendaftarkan barcode yang sudah ada ditolak
  dengan pesan sederhana + tautan ke produk yang sudah terdaftar.
- Pencarian cocokkan **nama** (mengandung kata) atau **barcode** (mengandung digit).
- Validasi ramah: nama/barcode/kategori wajib; harga & stok angka ≥ 0.

## 8. Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│ UI — src/app + src/components                               │
│   mobile-first; hanya memakai layanan lewat AppProviders    │
├─────────────────────────────────────────────────────────────┤
│ LOGIKA APLIKASI — src/services (offline-first)              │
│   ProductService: daftar/cari/tambah/edit/lookup barcode    │
├──────────────┬──────────────────────────────┬───────────────┤
│ DOMAIN       │ SINKRONISASI — src/sync      │ DATA          │
│ src/domain   │ antrean operasi (siap T4)    │ LocalStore    │
│ (murni)      │                              │ (lokal)       │
└──────────────┴──────────────────────────────┴───────────────┘
```

Aturan yang dijaga:

1. **UI tidak berisi logika bisnis** — komponen hanya memanggil layanan.
2. **Akses Google Sheets terisolasi di `src/data/google`** — implementasi
   masuk di Tahap 4 tanpa menyentuh UI/layanan lain.
3. **Penyimpanan perangkat tidak disentuh UI langsung** — semua lewat
   `LocalStore`.
4. **Semua dependensi disuntikkan** lewat composition root
   (`src/services/container.ts`).
5. **Pemindai kamera diisolasi** di `ScannerView` (ZXing dimuat dinamis);
   layar scan hanya menerima hasil berupa teks barcode.

### Arsitektur data di masa depan (persiapan saja)

```
AKUN GOOGLE PENGGUNA → GOOGLE SHEETS → APLIKASI → UI MOBILE
```

Data warung tetap milik pemiliknya. Kontrak `StoreDataRepository`, skema
tab Sheets (`sheets-schema.ts`), kontrak `AuthProvider`, dan antrean
`QueueSyncEngine` sudah tersedia — setiap tulis produk hari ini otomatis
menghasilkan operasi antrean yang tinggal dikirim saat Tahap 4 aktif.

## 9. Peta Fase → Modul

| Modul UI | Fase aktif penuh | Siap sejak |
| --- | --- | --- |
| Beranda, navigasi, shell | 1 | ✅ Tahap 1 |
| Produk — database, cari, stok, harga, tambah/edit, scanner | 2 | ✅ Tahap 2 |
| Transaksi — tunai, bon, riwayat | 3 | kerangka UI ✅ |
| Google Sheets — koneksi, baca/tulis, sinkronisasi | 4 | arsitektur ✅ |
| Laporan — harian/mingguan/bulanan, analisis | 5 | kerangka UI ✅ |
| Asisten AI — tanya data warung | 6 | kerangka UI ✅ |
| Integrasi, keandalan, produksi | 7 | — |
| Mock-data & validasi end-to-end | 8 | — |

## 10. Roadmap Pengembangan

1. **PHASE 1 — Foundation, Mobile UX & Application Shell** ✅
2. **PHASE 2 — Product Database & Barcode System** ✅ *(saat ini)*
3. PHASE 3 — Transaction, Cash & Bon System
4. PHASE 4 — Google Sheets Database & Data Synchronization
5. PHASE 5 — Dashboard, Reports & Search
6. PHASE 6 — AI Business Assistant
7. PHASE 7 — Integration, Reliability & Production Readiness
8. PHASE 8 — Full Mock-Data Testing & End-to-End Validation

## 11. Keamanan

- Tidak ada kredensial di kode sumber; `.gitignore` memblokir `.env*`
  kecuali `.env.example`.
- Variabel server (`GOOGLE_*`) hanya dibaca di kode server
  (`src/config/env.ts`).
- Prinsip data: data warung milik pemilik warung — di perangkatnya dan
  (mulai Tahap 4) di Google Sheets miliknya sendiri.

## 12. Lanjut ke Tahap 3

Tahap 3 (Transaksi, Tunai & Bon) dibangun langsung di atas fondasi ini:

1. Hasil scan “Produk Ditemukan” dilanjutkan ke keranjang (jumlah → tunai/bon).
2. `TransactionService` (validasi, simpan lokal, antrean) sudah tersedia.
3. Stok produk tinggal dipotong oleh alur transaksi; saldo bon pelanggan
   mengaktifkan `CustomerService` + model `Customer`.
4. Beranda (ringkasan hari ini & aktivitas terakhir) mulai terisi otomatis.
