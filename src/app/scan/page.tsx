import type { Metadata } from "next";
import { Suspense } from "react";
import { ScanScreen } from "@/components/scan/ScanScreen";

export const metadata: Metadata = {
  title: "Scan Barang",
};

/**
 * LAYAR SCAN — pusat alur jualan: scan → produk → jumlah → tunai/bon → simpan.
 */
export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-stone-950" />}>
      <ScanScreen />
    </Suspense>
  );
}
