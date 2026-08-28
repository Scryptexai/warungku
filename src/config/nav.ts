import type { IconName } from "@/components/ui/icons";

/**
 * Definisi area navigasi aplikasi.
 * `phase` menandakan fase roadmap ketika area tersebut mendapat fungsionalitas
 * penuh — ditampilkan pada UI agar ekspektasi pengguna jelas.
 */

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  phase: number;
}

/** Item utama pada navigasi bawah (maksimal 5 agar jempol mudah menjangkau). */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Beranda",
    description: "Ringkasan warung Anda",
    icon: "home",
    phase: 1,
  },
  {
    href: "/kasir",
    label: "Kasir",
    description: "Catat penjualan dengan cepat",
    icon: "cart",
    phase: 4,
  },
  {
    href: "/produk",
    label: "Produk",
    description: "Daftar barang, harga, dan stok",
    icon: "box",
    phase: 3,
  },
  {
    href: "/transaksi",
    label: "Transaksi",
    description: "Riwayat penjualan warung",
    icon: "receipt",
    phase: 4,
  },
  {
    href: "/lainnya",
    label: "Lainnya",
    description: "Menu tambahan aplikasi",
    icon: "more",
    phase: 1,
  },
];

/** Menu tambahan yang bisa diakses dari halaman "Lainnya". */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    href: "/pelanggan",
    label: "Pelanggan",
    description: "Daftar pelanggan dan bon",
    icon: "users",
    phase: 4,
  },
  {
    href: "/laporan",
    label: "Laporan",
    description: "Omzet dan laporan penjualan",
    icon: "chart",
    phase: 5,
  },
  {
    href: "/asisten",
    label: "Asisten AI",
    description: "Tanya data warung Anda",
    icon: "sparkles",
    phase: 6,
  },
  {
    href: "/pengaturan",
    label: "Pengaturan",
    description: "Koneksi Google dan aplikasi",
    icon: "settings",
    phase: 2,
  },
];

/** Seluruh area utama aplikasi (untuk kisi menu di Beranda). */
export const ALL_AREA_ITEMS: NavItem[] = [
  {
    href: "/kasir",
    label: "Kasir",
    description: "Jualan cepat dengan barcode",
    icon: "cart",
    phase: 4,
  },
  {
    href: "/produk",
    label: "Produk",
    description: "Barang, harga, dan stok",
    icon: "box",
    phase: 3,
  },
  {
    href: "/pelanggan",
    label: "Pelanggan",
    description: "Pelanggan langganan dan bon",
    icon: "users",
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
    description: "Omzet dan ekspor data",
    icon: "chart",
    phase: 5,
  },
  {
    href: "/asisten",
    label: "Asisten AI",
    description: "Tanya apa saja soal warung",
    icon: "sparkles",
    phase: 6,
  },
  {
    href: "/pengaturan",
    label: "Pengaturan",
    description: "Koneksi Google Sheets",
    icon: "settings",
    phase: 2,
  },
];
