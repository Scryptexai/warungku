import type { IconName } from "@/components/ui/icons";

/**
 * Definisi navigasi & pintasan aplikasi.
 *
 * `phase` = fase roadmap ketika fungsi penuh modul tersebut aktif
 * (lihat README). Seluruh tujuan sudah bisa dibuka sejak Tahap 1
 * sebagai kerangka UI.
 */

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  phase: number;
}

/** Navigasi bawah utama — pola dompet digital: 5 tab, ikon + label singkat. */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Beranda",
    description: "Ringkasan warung & scan barang",
    icon: "home",
    phase: 1,
  },
  {
    href: "/transaksi",
    label: "Transaksi",
    description: "Riwayat penjualan tunai & bon",
    icon: "receipt",
    phase: 3,
  },
  {
    href: "/produk",
    label: "Produk",
    description: "Daftar barang, harga, & stok",
    icon: "box",
    phase: 2,
  },
  {
    href: "/laporan",
    label: "Laporan",
    description: "Ringkasan penjualan",
    icon: "chart",
    phase: 5,
  },
  {
    href: "/ai",
    label: "AI",
    description: "Asisten bisnis warung",
    icon: "sparkles",
    phase: 6,
  },
];

/** Pintasan di Beranda — akses satu ketuk ke fungsi penting warung. */
export const QUICK_ACCESS_ITEMS: NavItem[] = [
  {
    href: "/produk",
    label: "Tambah Produk",
    description: "Tambah produk baru",
    icon: "plus",
    phase: 2,
  },
  {
    href: "/transaksi",
    label: "Transaksi",
    description: "Riwayat penjualan",
    icon: "receipt",
    phase: 3,
  },
  {
    href: "/laporan",
    label: "Laporan",
    description: "Omzet & analisis",
    icon: "chart",
    phase: 5,
  },
  {
    href: "/ai",
    label: "Asisten AI",
    description: "Tanya data warung",
    icon: "sparkles",
    phase: 6,
  },
];

/** Halaman layar scan barcode — aksi utama aplikasi. */
export const SCAN_PAGE_HREF = "/scan";
