import type { Metadata } from "next";
import { ScanScreen } from "@/components/scan/ScanScreen";

export const metadata: Metadata = {
  title: "Scan Barcode",
};

/**
 * LAYAR SCAN — aksi utama aplikasi (dari Beranda).
 * Kamera aktif di perangkat pengguna; hasil scan diarahkan ke
 * produk dikenali / pendaftaran produk baru.
 */
export default function ScanPage() {
  return <ScanScreen />;
}
