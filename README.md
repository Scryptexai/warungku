# Warungku — Kasir Warung Mobile-First

Aplikasi kasir (POS) dan asisten bisnis untuk warung / toko kelontong
Indonesia. Dirancang untuk pemilik warung dengan pengalaman teknis minimal:
**satunya cara berjualan adalah scan barcode** — tunai atau bon — dan seluruh
antarmuka memakai bahasa Indonesia sehari-hari.

---

## Status: PHASE 1 — Foundation, Mobile UX & Application Shell

| Area | Status |
| --- | --- |
| Kerangka aplikasi + navigasi bawah (5 tab) | ✅ Tahap 1 |
| Beranda gaya dompet digital + aksi utama **Scan** | ✅ Tahap 1 |
| Layar scan barcode (kerangka UI/UX) | ✅ Tahap 1 |
| Kerangka layar Transaksi / Produk / Laporan / AI | ✅ Tahap 1 |
| Profil warung (tersimpan di perangkat) | ✅ Tahap 1 |
| Arsitektur data & kontrak domain (persiapan) | ✅ Tahap 1 |
| Sistem Produk & Barcode | ⏳ Tahap 2 |
| Transaksi, Tunai & Bon | ⏳ Tahap 3 |
| Google Sheets Database & Sinkronisasi | ⏳ Tahap 4 |
| Dashboard, Laporan & Pencarian | ⏳ Tahap 5 |
| Asisten AI | ⏳ Tahap 6 |
| Integrasi & kesiapan produksi | ⏳ Tahap 7 |
| Uji mock-data end-to-end | ⏳ Tahap 8 |

---

## 1. Tujuan Produk

Aplikasi kasir untuk warung kecil dengan perangkat utama **smartphone**.
Pengguna adalah pemilik atau penjaga warung. Prioritas desain:

1. Familiar — mengikuti pola aplikasi dompet digital yang sudah dikenal
2. Sederhana — layar ringkas, pilihan sedikit
3. Cepat — sedikit ketukan untuk tugas yang sering dilakukan
4. Jelas — ikon konvensional, teks terbaca
5. Target sentuh besar — nyaman dipakai satu tangan

Alur inti produk:

```
BUKA APLIKASI → SCAN BARCODE → PRODUK DIKENALI → JUMLAH → TUNAI / BON → SIMPAN
```

## 2. Referensi UX — Pola Dompet Digital

Acukan UX adalah aplikasi dompet digital Indonesia yang sudah akrab
(DANA, GoPay, OVO, dsb.) — **pola interaksinya**, bukan aset mereknya.
Yang diadopsi: beranda sederhana dengan satu aksi utama menonjol, kisi
pintasan ikon, kartu informasi ringkas, aktivitas terbaru, dan navigasi
bawah 5 tab. Label & fungsi disesuaikan untuk konteks warung.

Hierarki Beranda (atas ke bawah):

1. **Header profil warung** — nama warung, ketuk untuk profil
2. **Ringkasan hari ini** — omzet / jumlah transaksi / bon
3. **Aksi utama: SCAN BARCODE** — tombol besar dominan di tengah
4. **Akses cepat** — 4 pintasan ikon (Tambah Produk, Transaksi, Laporan, AI)
5. **Aktivitas terakhir** — transaksi terbaru (terisi mulai Tahap 3)
6. **Navigasi bawah** — Beranda · Transaksi · Produk · Laporan · AI

## 3. Teknologi

| Teknologi | Peran |
| --- | --- |
| [Next.js 15](https://nextjs.org) (App Router) | Kerangka aplikasi + API routes |
| [React 19](https://react.dev) | UI |
| [TypeScript 5](https://www.typescriptlang.org) (strict) | Kontrak data & keamanan tipe |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling mobile-first |
| [ESLint 9](https://eslint.org) | Kualitas kode |
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
| `npm run smoke` | Uji asap arsitektur inti (lihat `scripts/smoke-sync.ts`) |

## 5. Konfigurasi Environment

Tidak ada kredensial di kode sumber — semuanya lewat environment variable.
Lihat `.env.example` (dokuemen lengkap di dalam file tersebut).

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
├── scripts/smoke-sync.ts       # Uji asap arsitektur inti
└── src/
    ├── app/                    # UI — routes App Router
    │   ├── layout.tsx          #   Cangkang aplikasi + metadata
    │   ├── page.tsx            #   BERANDA (gaya dompet digital)
    │   ├── scan/               #   LAYAR SCAN — aksi utama (kerangka UI)
    │   ├── transaksi/          #   Transaksi  (fungsi penuh di Tahap 3)
    │   ├── produk/             #   Produk     (fungsi penuh di Tahap 2)
    │   ├── laporan/            #   Laporan    (fungsi penuh di Tahap 5)
    │   ├── ai/                 #   Asisten AI (fungsi penuh di Tahap 6)
    │   ├── profil/             #   Profil warung (lokal) + info Google Sheets
    │   └── api/health/         #   Health check API
    ├── components/
    │   ├── layout/             #   AppShell, BottomNav (5 tab)
    │   ├── home/               #   HomeHeader, TodaySummaryCard, ScanHero,
    │   │                       #   QuickAccess, RecentActivity
    │   ├── products/           #   ProductsScreen (kerangka pencarian + tambah)
    │   ├── transactions/       #   TransactionsScreen (tab Semua/Tunai/Bon)
    │   ├── reports/            #   ReportsScreen (periode + ringkasan)
    │   ├── profile/            #   ProfileForm (nama warung → penyimpanan lokal)
    │   ├── providers/          #   AppProviders (composition root → React)
    │   └── ui/                 #   Primitif: Button, LinkButton, EmptyState,
    │                           #   PageHeader, SectionCard, PhaseNotice, ikon
    ├── services/               # LOGIKA APLIKASI (use case)
    │   ├── store-profile.service.ts  # Profil warung lokal (dipakai UI Tahap 1)
    │   ├── product.service.ts        # (persiapan Tahap 2)
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
    ├── lib/                    # Utilitas (errors, id, money, datetime, cn)
    └── config/                 # app.ts, env.ts, nav.ts
```

## 7. Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│ UI — src/app + src/components                               │
│   mobile-first; hanya memakai layanan lewat AppProviders    │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ LOGIKA APLIKASI — src/services (offline-first)              │
└───────┬──────────────────────────────┬──────────────────────┘
        ▼                              ▼
┌───────────────────┐        ┌────────────────────────────────┐
│ DOMAIN — src/domain│        │ SINKRONISASI — src/sync        │
│ entitas murni      │◀──────│ QueueSyncEngine (antrean)       │
└───────────────────┘        └───────────────┬────────────────┘
                                             ▼
┌─────────────────────────────────────────────────────────────┐
│ DATA — src/data                                             │
│   StoreDataRepository (kontrak remote → Google Sheets, T4)  │
│   LocalStore (kontrak lokal → localStorage / memori)        │
└─────────────────────────────────────────────────────────────┘
```

Aturan yang dijaga:

1. **UI tidak berisi logika bisnis** — komponen hanya memanggil layanan.
2. **Akses Google Sheets terisolasi di `src/data/google`** — implementasi
   masuk di Tahap 4 tanpa menyentuh UI/layanan lain.
3. **Penyimpanan perangkat tidak disentuh UI langsung** — semua lewat
   `LocalStore` (dipakai antara lain oleh profil warung di Tahap 1).
4. **Semua dependensi disuntikkan** lewat composition root
   (`src/services/container.ts`).
5. **Domain murni** — `src/domain` tidak mengimpor framework apa pun.

### Arsitektur data di masa depan (persiapan saja)

```
AKUN GOOGLE PENGGUNA → GOOGLE SHEETS → APLIKASI → UI MOBILE
```

Data warung tetap milik pemiliknya (Google Sheets milik sendiri). Kontrak
`StoreDataRepository`, skema tab Sheets (`sheets-schema.ts`), kontrak
`AuthProvider`, dan fondasi sinkronisasi (`QueueSyncEngine`) sudah tersedia —
Tahap 4 cukup mengisi implementasi Google tanpa merombak arsitektur.

### Persistensi lokal & sinkronisasi (arsitektur)

`LocalStore` mendukung: cache produk, cache pelanggan, transaksi tertunda,
antrean sinkronisasi, dan status sinkronisasi. `QueueSyncEngine` menerapkan
alur *operasi lokal → antrean → remote; gagal → tetap di antrean → dicoba
ulang saat koneksi kembali*. Pada Tahap 1 layanan-layanan ini belum dipakai
penuh oleh UI (sesuai batasan fase) — gunakan `npm run smoke` untuk
membuktikan mekanikanya.

## 8. Peta Fase → Modul

| Modul UI | Fase aktif penuh | Siap sejak |
| --- | --- | --- |
| Beranda, navigasi, shell, scan (kerangka) | 1 | Tahap 1 ✅ |
| Produk — database, cari, stok, harga, tambah/edit | 2 | kerangka UI ✅ |
| Transaksi — tunai, bon, riwayat | 3 | kerangka UI ✅ |
| Google Sheets — koneksi, baca/tulis, sinkronisasi | 4 | arsitektur ✅ |
| Laporan — harian/mingguan/bulanan, analisis | 5 | kerangka UI ✅ |
| Asisten AI — tanya data warung | 6 | kerangka UI ✅ |
| Integrasi, keandalan, produksi | 7 | — |
| Mock-data & validasi end-to-end | 8 | — |

## 9. Roadmap Pengembangan

1. **PHASE 1 — Foundation, Mobile UX & Application Shell** ✅ *(saat ini)*
2. PHASE 2 — Product & Barcode System
3. PHASE 3 — Transaction, Cash & Bon System
4. PHASE 4 — Google Sheets Database & Data Synchronization
5. PHASE 5 — Dashboard, Reports & Search
6. PHASE 6 — AI Business Assistant
7. PHASE 7 — Integration, Reliability & Production Readiness
8. PHASE 8 — Full Mock-Data Testing & End-to-End Validation

## 10. Keamanan

- Tidak ada kredensial di kode sumber; `.gitignore` memblokir `.env*`
  kecuali `.env.example`.
- Variabel server (`GOOGLE_*`) hanya dibaca di kode server
  (`src/config/env.ts`).
- Prinsip data: data warung milik pemilik warung — di perangkatnya dan
  (mulai Tahap 4) di Google Sheets miliknya sendiri.

## 11. Lanjut ke Tahap 2

Tahap 2 (Sistem Produk & Barcode) dibangun langsung di atas fondasi ini:

1. Layar scan (`/scan`) dihubungkan dengan kamera + pustaka pembaca barcode.
2. Barcode yang sudah dikenal → produk otomatis masuk ke alur penjualan.
3. Barcode baru → form produk sederhana (nama, harga, stok) menggantikan
   kartu "Tahap 2" di `/produk`.
4. Penyimpanan memakai `ProductService` + `LocalStore` yang sudah tersedia;
   sinkronisasi ke Google Sheets tetap menjadi urusan Tahap 4.
