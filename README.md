# Warungku — POS & AI Business Assistant untuk Warung Indonesia

Aplikasi kasir (POS) dan asisten bisnis AI untuk warung / toko kelontong
Indonesia. Dirancang untuk pemilik warung dengan pengetahuan teknis
minimal: mobile-first, tombol besar, bahasa Indonesia sederhana.

**Konsep inti produk:**

```
Barcode → Produk → Keranjang → Tunai/Bon → Transaksi → Inventori → Laporan → AI
```

**Prinsip data:** Google Sheets adalah sumber data warung. Setiap warung
menghubungkan akun Google miliknya sendiri dan memiliki Google Sheet-nya
sendiri — tidak ada basis data transaksi terpusat milik aplikasi. Aplikasi
menyimpan data secara lokal di perangkat dan menyinkronkannya ke Google
Sheets, sehingga warung tetap bisa berjualan saat jaringan putus.

---

## Status: PHASE 1 — FOUNDATION

| Aspek | Status |
| --- | --- |
| Arsitektur proyek & pemisahan lapisan | ✅ Selesai (Tahap 1) |
| Kontrak data inti (domain) | ✅ Selesai (Tahap 1) |
| Abstraksi Google Sheets | ✅ Kontrak siap; implementasi Tahap 2 |
| Persistensi lokal | ✅ Berfungsi (localStorage + memori) |
| Fondasi sinkronisasi (antrean) | ✅ Berfungsi; target Google Tahap 2 |
| Fondasi UI + navigasi mobile-first | ✅ Selesai (Tahap 1) |
| OAuth & Google Sheets live | ⏳ Tahap 2 |
| Produk & barcode | ⏳ Tahap 3 |
| Kasir & transaksi penuh | ⏳ Tahap 4 |
| Pencarian & laporan | ⏳ Tahap 5 |
| Asisten AI | ⏳ Tahap 6 |
| Validasi menyeluruh + mock data | ⏳ Tahap 7 |

---

## Tujuan Proyek

1. **Sederhana & andal** — pemilik warung bisa mengoperasikannya tanpa
   pelatihan khusus; antarmuka memakai istilah Indonesia sehari-hari.
2. **Data milik warung** — semua data hidup di Google Sheets milik warung;
   pemilik bisa membaca datanya kapan pun di luar aplikasi.
3. **Tahan gangguan jaringan** — operasi ditulis lokal dulu, lalu
   disinkronkan; kegagalan koneksi tidak pernah menghilangkan data.
4. **Berkembang bertahap** — dibangun dalam 7 fase; setiap fase menyusun di
   atas fondasi fase sebelumnya tanpa restrukturisasi.

## Teknologi

| Teknologi | Peran |
| --- | --- |
| [Next.js 15](https://nextjs.org) (App Router) | Kerangka aplikasi + API routes |
| [React 19](https://react.dev) | UI |
| [TypeScript 5](https://www.typescriptlang.org) (strict) | Kontrak data & keamanan tipe |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling mobile-first |
| [ESLint 9](https://eslint.org) + eslint-config-next | Kualitas kode |
| Google Sheets API + Google OAuth | Lapisan data remote (mulai Tahap 2) |
| localStorage (kini) → IndexedDB (bila perlu) | Persistensi lokal perangkat |

## Menjalankan Secara Lokal

Prasyarat: Node.js ≥ 20 dan npm.

```bash
# 1. Pasang dependensi
npm install

# 2. (Opsional di Tahap 1) siapkan environment lokal
cp .env.example .env.local

# 3. Jalankan mode pengembangan
npm run dev
# buka http://localhost:3000
```

Mode produksi:

```bash
npm run build
npm run start
```

### Skrip

| Skrip | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan (0.0.0.0:3000) |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build produksi |
| `npm run lint` | ESLint seluruh proyek |
| `npm run typecheck` | Validasi TypeScript (`tsc --noEmit`) |
| `npm run smoke` | Uji asap arsitektur inti (antrean sinkronisasi, offline-first) — lihat `scripts/smoke-sync.ts` |

## Konfigurasi Environment

Semua konfigurasi lewat environment variable — tidak ada kredensial di
kode sumber. Lihat `.env.example` untuk dokumentasi lengkap.

| Variabel | Lingkup | Default | Dipakai mulai | Keterangan |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | publik | `Warungku` | Tahap 1 | Nama aplikasi |
| `NEXT_PUBLIC_APP_ENV` | publik | `development` | Tahap 1 | Lingkungan aplikasi |
| `NEXT_PUBLIC_APP_URL` | publik | `http://localhost:3000` | Tahap 1 | URL dasar (redirect OAuth Tahap 2) |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | publik | `IDR` | Tahap 1 | Mata uang default |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | publik | `id-ID` | Tahap 1 | Lokal default |
| `NEXT_PUBLIC_DEFAULT_TIMEZONE` | publik | `Asia/Jakarta` | Tahap 1 | Zona waktu default |
| `GOOGLE_CLIENT_ID` | server | — | Tahap 2 | OAuth Client ID Google |
| `GOOGLE_CLIENT_SECRET` | server | — | Tahap 2 | OAuth Client Secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | server | turunan `APP_URL` | Tahap 2 | URI callback OAuth |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | server | — | Tahap 2 | Enkripsi refresh token di server |
| `NEXT_PUBLIC_ENABLE_MOCK_DATA` | publik | `false` | Tahap 7 | Data contoh untuk validasi |

Pembacaan environment terpusat di `src/config/env.ts`
(`getPublicAppEnv()` aman untuk klien; `getGoogleServerEnv()` khusus server).

---

## Struktur Proyek

```
warungku/
├── .env.example                  # Dokumentasi environment (tanpa kredensial)
├── next.config.ts                # Konfigurasi Next.js
├── eslint.config.mjs             # ESLint (flat config)
├── postcss.config.mjs            # Tailwind CSS 4 via PostCSS
└── src/
    ├── app/                      # UI: routes App Router + API routes
    │   ├── layout.tsx            #   Cangkang + provider
    │   ├── page.tsx              #   Beranda
    │   ├── kasir/                #   Kasir            (Tahap 4)
    │   ├── produk/               #   Produk           (Tahap 3)
    │   ├── pelanggan/            #   Pelanggan        (Tahap 4)
    │   ├── transaksi/            #   Transaksi        (Tahap 4/5)
    │   ├── laporan/              #   Laporan          (Tahap 5)
    │   ├── asisten/              #   Asisten AI       (Tahap 6)
    │   ├── pengaturan/           #   Pengaturan       (Tahap 2)
    │   ├── lainnya/              #   Hub menu sekunder
    │   └── api/health/           #   Health check API
    ├── components/               # Komponen React
    │   ├── layout/               #   AppShell, TopBar, BottomNav, SyncStatusPill
    │   ├── providers/            #   AppProviders (React context container)
    │   ├── home/                 #   Kartu ringkasan data lokal
    │   ├── settings/             #   Kartu uji arsitektur sinkronisasi
    │   └── ui/                   #   Primitif: Button, SectionCard, ikon, dll.
    ├── domain/                   # MODEL DOMAIN (murni, tanpa framework)
    │   ├── store.ts              #   Store
    │   ├── product.ts            #   Product
    │   ├── customer.ts           #   Customer
    │   ├── transaction.ts        #   Transaction, TransactionItem
    │   ├── inventory.ts          #   Inventory
    │   ├── price-history.ts      #   PriceHistory
    │   ├── reports.ts            #   ReportsData, TimeRange
    │   ├── sync.ts               #   SyncQueueItem, SyncOperation, SyncStatus
    │   └── index.ts              #   Barrel export
    ├── services/                 # LOGIKA APLIKASI (use cases)
    │   ├── product.service.ts    #   Offline-first produk
    │   ├── customer.service.ts   #   Offline-first pelanggan
    │   ├── transaction.service.ts#   Pencatatan transaksi → antrean
    │   ├── sync.service.ts       #   Facade sinkronisasi untuk UI
    │   ├── local-data.service.ts #   Ringkasan data lokal
    │   └── container.ts          #   COMPOSITION ROOT (DI)
    ├── data/                     # LAPISAN AKSES DATA
    │   ├── store-data-repository.ts  # Kontrak remote (port)
    │   ├── google/               #   Integrasi Google (terisolasi)
    │   │   ├── google-api-client.ts      # Klien HTTP Google (Tahap 2)
    │   │   ├── google-sheets-store-repository.ts # Implementasi Sheets (Tahap 2)
    │   │   └── sheets-schema.ts          # Skema tab/kolom target Sheets
    │   └── local/                #   Persistensi lokal
    │       ├── local-store.ts        # Kontrak LocalStore
    │       ├── browser-local-store.ts# localStorage
    │       ├── memory-local-store.ts # memori (SSR/pengujian)
    │       └── index.ts              # Pabrik createLocalStore()
    ├── sync/                     # SINKRONISASI
    │   ├── sync-engine.ts        #   Kontrak SyncEngine + SyncTarget
    │   ├── queue-sync-engine.ts  #   Engine antrean offline-first
    │   └── not-connected-sync-target.ts # Target bawaan Tahap 1
    ├── auth/                     # AUTENTIKASI
    │   ├── auth-provider.ts      #   Kontrak AuthProvider
    │   ├── auth.types.ts         #   Sesi, scope OAuth
    │   └── not-connected-auth-provider.ts # Bawaan Tahap 1
    ├── types/                    # TIPE BERSAMA
    │   ├── shared.ts             #   ISODateTime, JsonValue
    │   └── api.ts                #   Amplop respons API standar
    ├── lib/                      # UTILITAS
    │   ├── errors.ts             #   AppError + turunan
    │   ├── result.ts             #   Result<T,E>
    │   ├── id.ts                 #   ID generator (prefiks prd_/cst_/trx_)
    │   ├── money.ts              #   formatIDR
    │   ├── datetime.ts           #   Format tanggal Indonesia
    │   └── cn.ts                 #   Penggabung kelas CSS
    └── config/                   # KONFIGURASI
        ├── app.ts                #   Konstanta (fase, namespace storage)
        ├── env.ts                #   Akses environment terpusat
        └── nav.ts                #   Definisi area navigasi
```

---

## Arsitektur

### Prinsip lapisan

```
┌────────────────────────────────────────────────────────────┐
│ UI — src/app (routes) + src/components                     │
│   hanya memakai layanan lewat AppProviders (React context) │
└──────────────────────────┬─────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│ LOGIKA APLIKASI — src/services                             │
│   Product/Customer/Transaction/Sync service (offline-first)│
└───────┬──────────────────────────────┬─────────────────────┘
        ▼                              ▼
┌───────────────────┐        ┌──────────────────────────────┐
│ DOMAIN — src/domain│        │ SINKRONISASI — src/sync      │
│ entitas murni      │◀──────│ QueueSyncEngine (antrean)     │
│ tanpa dependensi   │        │ → SyncTarget (port remote)   │
└───────────────────┘        └──────────────┬───────────────┘
                                            ▼
┌────────────────────────────────────────────────────────────┐
│ DATA — src/data                                            │
│   StoreDataRepository (kontrak remote)                     │
│     └── google/  → Google Sheets (implementasi Tahap 2)    │
│   LocalStore (kontrak lokal)                               │
│     └── local/   → localStorage / memori                   │
└────────────────────────────────────────────────────────────┘
```

Aturan yang dijaga:

1. **UI tidak berisi logika bisnis** — komponen hanya memanggil layanan.
2. **Akses Google Sheets terisolasi di `src/data/google`** — satu-satunya
   tempat yang mengenal endpoint Google adalah `GoogleApiClient`.
3. **Penyimpanan perangkat tidak disentuh UI** — semua lewat `LocalStore`.
4. **Semua dependensi disuntikkan** lewat composition root
   (`src/services/container.ts`); mengganti implementasi tidak menyentuh
   konsumen. Inilah yang membuat Tahap 2 cukup menukar implementasi
   `NotConnected*` menjadi implementasi Google sungguhan.
5. **Domain murni** — `src/domain` tidak mengimpor framework apa pun, sehingga
   awet terhadap perubahan UI/library.

### Alur tulis data (offline-first)

```
OPERASI PENGGUNA (mis. catat transaksi)
   ↓ validasi di layanan (src/services)
   ↓ tulis KE LOCALSTORE DULU  ← data aman sejak detik ini
   ↓ enqueue() → QueueSyncEngine → antrean tersimpan lokal
   ↓ syncNow() best-effort
        ├─ sukses   → item keluar antrean (remote = Google Sheets)
        └─ gagal    → item TETAP di antrean + attempts +1
                      → dicoba ulang otomatis saat koneksi kembali
```

---

## Arsitektur Data (Kontrak Inti)

Didefinisikan di `src/domain` — detail field lengkap ada di tiap file.

| Entitas | Field inti | File |
| --- | --- | --- |
| `Store` | id, nama, spreadsheetId (Sheets milik warung), zona waktu | `store.ts` |
| `Product` | id, barcode, nama, currentPrice, stock, unit, isActive | `product.ts` |
| `Customer` | id, nama, telepon, outstandingBalance (bon) | `customer.ts` |
| `Transaction` | id, timestamp, customer, paymentType (CASH/BON), total, status, items | `transaction.ts` |
| `TransactionItem` | transactionId, productId, productName (snapshot), quantity, unitPrice, subtotal | `transaction.ts` |
| `InventoryEntry` | productId, quantity, updatedAt (+ alasan penyesuaian) | `inventory.ts` |
| `PriceHistoryEntry` | productId, previousPrice, newPrice, changedAt | `price-history.ts` |
| `ReportsData` | rentang, omzet, jumlah transaksi, tunai vs bon, produk terlaris | `reports.ts` |
| `SyncQueueItem` | operasi (kind/entity/payload), status, attempts, lastError | `sync.ts` |

Kontrak sengaja extensible: enum satuan produk, alasan penyesuaian stok, dan
status antrean didefinisikan sebagai union terbuka-dokumentasi sehingga fase
berikutnya bisa menambah nilai tanpa merusak data lama.

## Arsitektur Google Sheets

- **Satu spreadsheet per warung**, dibuat di akun Google milik warung saat
  koneksi pertama (Tahap 2). Aplikasi tidak punya server data transaksi.
- **Skema target** ditetapkan sejak Tahap 1 di
  `src/data/google/sheets-schema.ts` — tab: `Meta`, `Produk`, `Pelanggan`,
  `Transaksi`, `Detail_Transaksi`, `Inventori`, `Riwayat_Harga`, dengan nama
  kolom Indonesia agar pemilik warung bisa membacanya langsung di Sheets.
- **Akses diisolasi** melalui dua interface:
  - `GoogleApiClient` (`src/data/google/google-api-client.ts`) — satu-satunya
    tempat bicara dengan endpoint Google (bearer token, retry).
  - `StoreDataRepository` (`src/data/store-data-repository.ts`) — kontrak
    operasi data (`getProducts`, `createProduct`, `getCustomers`,
    `createCustomer`, `updateCustomer`, `createTransaction`,
    `getTransactions`, `getInventory`, `updateInventory`, `getReportsData`,
    dll.) yang diimplementasikan `GoogleSheetsStoreRepository` pada Tahap 2.
- **Autentikasi** lewat `AuthProvider` (`src/auth`) dengan scope minimum:
  `spreadsheets` + `drive.file` (hanya file yang dibuat aplikasi).
- Tahap 1 menyediakan implementasi `NotConnected*` yang eksplisit, sehingga
  seluruh aplikasi bisa dibangun dan diuji sebelum Google masuk.

## Arsitektur Persistensi Lokal

Kontrak `LocalStore` (`src/data/local/local-store.ts`) mendukung tepat enam
koleksi:

| Koleksi | Isi |
| --- | --- |
| `products` | Cache produk terakhir |
| `customers` | Cache pelanggan terakhir |
| `pendingTransactions` | Transaksi yang belum tersinkron |
| `syncQueue` | Antrean operasi sinkronisasi |
| `syncStatus` | Snapshot status sinkronisasi terakhir |
| `storeProfile` | Profil warung di perangkat ini |

- Implementasi: `BrowserLocalStore` (localStorage, kunci ter-namespaced
  `warungku:v1:*` — versi skema memudahkan migrasi) dan `MemoryLocalStore`
  (SSR/pengujian). Pabrik `createLocalStore()` memilih otomatis.
- Bila kelak butuh kapasitas lebih besar (riwayat ribuan transaksi),
  implementasi IndexedDbLocalStore dapat ditambahkan **tanpa mengubah UI
  maupun layanan** — cukup daftar di pabrik.

## Arsitektur Sinkronisasi

Dua alur yang didukung (kontrak di `src/sync`):

```
OPERASI LOKAL → ANTREAN SYNC → GOOGLE SHEETS → SUKSES (item keluar antrean)

OPERASI LOKAL → ANTREAN SYNC → GAGAL JARINGAN → TETAP DI ANTREAN
             → DICOBa LAGI SAAT KONEKSI KEMBALI (event "online")
```

`QueueSyncEngine` (Tahap 1, sudah berfungsi):

1. `enqueue()` SELALU menulis item ke LocalStore sebelum mencoba mengirim —
   data tidak mungkin hilang.
2. `syncNow()` memeriksa `SyncTarget.isReady()`; bila belum siap → status
   `WAITING`, seluruh antrean menunggu (bukan error).
3. Pengiriman per item: sukses → hapus dari antrean; gagal → status kembali
   `PENDING`, `attempts` bertambah, pesan error tercatat.
4. Pemulihan crash: item `IN_PROGRESS` saat aplikasi mati dikembalikan ke
   `PENDING` saat `init()`.
5. Pendengar `online`/`offline` peramban memicu percobaan ulang otomatis.
6. Status dipublikasikan ke UI lewat `subscribe()` (pil status di TopBar).

Status yang mungkin: `IDLE`, `SYNCING`, `SYNCED`, `WAITING`, `ERROR` —
seluruhnya dirender berbahasa Indonesia (`describeSyncState`).

## Fondasi UI

- **Mobile-first**: lebar konten maksimal ponsel, navigasi bawah 5 tab
  (Beranda, Kasir, Produk, Transaksi, Lainnya), target sentuh ≥ 48px,
  area aman notch (`pb-safe`), `lang="id"`.
- **Tujuh area utama** tersedia sebagai route: `/kasir`, `/produk`,
  `/pelanggan`, `/transaksi`, `/laporan`, `/asisten`, `/pengaturan` —
  ditambah hub `/lainnya` dan `/` (Beranda). Halaman menampilkan penanda
  "Tahap N" agar jelas kapan fungsionalitasnya hadir.
- **Live dari fondasi**: kartu "Data di Perangkat Ini" (Beranda) membaca
  LocalStore sungguhan; kartu "Uji arsitektur sinkronisasi" (Pengaturan)
  memasukkan operasi ke antrean sungguhan dan menunjukkan operasi tersebut
  bertahan di antrean selama Google Sheets belum terhubung.

---

## Roadmap Pengembangan

| Fase | Isi | Status |
| --- | --- | --- |
| **1 — Foundation** | Arsitektur, kontrak data, abstraksi Google, persistensi lokal, fondasi sinkron & UI, environment, dokumentasi | ✅ **SAAT INI** |
| 2 — Google Account & Sheets Data Layer | OAuth, koneksi warung, Sheets milik warung, inisialisasi sheet, baca/tulis, sinkronisasi live | ⏳ |
| 3 — Product & Barcode | Buat/kelola produk, scan barcode, pengenalan produk, stok awal, harga & riwayat harga | ⏳ |
| 4 — POS, Cash & Bon | Keranjang, alur kasir, tunai/bon, pilih/buat pelanggan, pencatatan transaksi, potong stok & saldo bon | ⏳ |
| 5 — Search, History & Reporting | Riwayat transaksi, cari pelanggan, bon tertunggak, laporan harian/mingguan/bulanan, ekspor CSV/PDF | ⏳ |
| 6 — AI Business Assistant | Kueri bahasa natural, analisis penjualan/produk/inventori/bon, insight bisnis | ⏳ |
| 7 — End-to-End Validation | Akun Google dev, Sheet dev, mock data realistis, verifikasi seluruh alur | ⏳ |

## Keamanan

- Tidak ada kredensial di kode sumber; semuanya lewat environment variable
  (lihat `.env.example`). `.gitignore` memblokir `.env*` kecuali
  `.env.example`.
- Variabel server (`GOOGLE_*`) tidak pernah diimpor ke komponen klien;
  `getGoogleServerEnv()` hanya untuk kode server.
- Prinsip data: aplikasi tidak menyimpan data warung di server miliknya —
  hanya di perangkat warung dan Google Sheets milik warung.

---

## Lanjut ke Tahap 2

Tahap 2 membangun **di atas fondasi ini tanpa restrukturisasi**:

1. Implementasikan `GoogleOAuthApiClient` (token) dan lengkapi
   `GoogleSheetsStoreRepository` sesuai `sheets-schema.ts`.
2. Tambahkan API routes OAuth (`/api/auth/google/*`) + `GoogleAuthProvider`
   menggantikan `NotConnectedAuthProvider`.
3. Tambahkan `GoogleSheetsSyncTarget` menggantikan `NotConnectedSyncTarget` —
   antrean yang menumpuk selama Tahap 1 otomatis terkirim saat koneksi siap.
4. Alur koneksi warung + pembuatan spreadsheet di halaman Pengaturan.
5. Pendaftaran semuanya cukup dilakukan di satu tempat:
   `src/services/container.ts`.
