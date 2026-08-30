import type { Metadata } from "next";
import { Suspense } from "react";
import { ScanScreen } from "@/components/scan/ScanScreen";

export const metadata: Metadata = {
  title: "Transaksi Baru",
};

/**
 * LAYAR TRANSAKSI BARU (§5A) — cari/ketik ATAU scan → daftar → tunai/bon → simpan,
 * semuanya pada SATU layar tanpa pindah halaman.
 */
export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-stone-100" />}>
      <ScanScreen />
    </Suspense>
  );
}
