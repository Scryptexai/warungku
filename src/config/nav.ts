import type { IconName } from "@/components/ui/icons";

/**
 * Definisi navigasi & pintasan aplikasi.
 *
 * Navigasi bawah memakai pola dompet digital: tombol SCAN besar di TENGAH
 * (aksi utama aplikasi), diapit dua tab di kiri & kanan.
 */

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  phase: number;
}

/** Tab kiri tombol scan tengah. */
export const LEFT_NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dasbor",
    description: "Ringkasan warung & scan barang",
    icon: "home",
    phase: 1,
  },
  {
    href: "/transaksi",
    label: "Transaksi",
    description: "Riwayat penjualan tunai & bon",
    icon: "receipt",
    phase: 4,
  },
];

/** Tab kanan tombol scan tengah. */
export const RIGHT_NAV_ITEMS: NavItem[] = [
  {
    href: "/laporan",
    label: "Laporan",
    description: "Ringkasan penjualan",
    icon: "chart",
    phase: 4,
  },
  {
    href: "/ai",
    label: "AI",
    description: "Asisten bisnis warung",
    icon: "sparkles",
    phase: 6,
  },
];

/** Halaman tujuan tombol scan tengah — AKSI UTAMA aplikasi. */
export const SCAN_HREF = "/scan";

/** Pintasan di Beranda — akses satu ketuk ke fungsi penting warung. */
export const QUICK_ACCESS_ITEMS: NavItem[] = [
  {
    href: "/produk",
    label: "Produk",
    description: "Daftar barang warung",
    icon: "box",
    phase: 2,
  },
  {
    href: "/bon",
    label: "Bayar Bon",
    description: "Lihat & lunasi piutang pelanggan",
    icon: "receipt",
    phase: 4,
  },
  {
    href: "/transaksi",
    label: "Transaksi",
    description: "Riwayat penjualan",
    icon: "receipt",
    phase: 4,
  },
  {
    href: "/laporan",
    label: "Laporan",
    description: "Omzet & analisis",
    icon: "chart",
    phase: 4,
  },
];

/** Halaman layar scan barcode — aksi utama aplikasi. */
export const SCAN_PAGE_HREF = "/scan";
