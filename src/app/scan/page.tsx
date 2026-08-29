import type { Metadata } from "next";
import Link from "next/link";
import { FlowSteps } from "@/components/ui/FlowSteps";
import { Icon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Scan Barcode",
};

/**
 * LAYAR SCAN — tujuan aksi utama aplikasi.
 * Tahap 1: kerangka UI/UX layar pemindaian (bidik kamera, arah penggunaan,
 * dan alur lanjutan transaksi). Kamera & pengenalan barcode aktif di Tahap 2.
 */
export default function ScanPage() {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-stone-950 text-white">
      <div className="flex items-center gap-3 px-4 pb-2 pt-5">
        <Link
          href="/"
          aria-label="Tutup layar scan"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
        >
          <Icon name="close" className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold">Scan Barcode</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-6">
        <div className="relative flex h-60 w-60 items-center justify-center">
          <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-brand-400" />
          <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-brand-400" />
          <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-brand-400" />
          <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-brand-400" />
          <span className="absolute inset-x-7 top-1/2 h-0.5 animate-pulse rounded bg-brand-400/70" />
          <Icon name="barcode" className="h-20 w-20 text-white/70" />
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold">Arahkan kamera ke barcode barang</p>
          <p className="mt-1 max-w-[34ch] text-xs leading-relaxed text-white/60">
            Barang yang sudah tersimpan langsung dikenali otomatis. Barang baru?
            Form tambah produk akan muncul sendiri.
          </p>
        </div>

        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/70">
          Kamera &amp; pengenalan barcode aktif di Tahap 2
        </span>
      </div>

      <div className="mx-4 mb-8 rounded-2xl bg-white p-4 text-stone-900">
        <h2 className="text-sm font-bold">Alur jualan</h2>
        <div className="mt-2">
          <FlowSteps
            steps={["Scan barcode", "Produk dikenali", "Jumlah", "Tunai / Bon", "Selesai"]}
          />
        </div>
      </div>
    </div>
  );
}
