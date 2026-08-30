import Link from "next/link";
import { SCAN_PAGE_HREF } from "@/config/nav";
import { Icon } from "@/components/ui/icons";

/**
 * AKSI UTAMA APLIKASI — tombol dominan di tengah Beranda menuju layar
 * TRANSAKSI BARU (§5A): ketik nama barang ATAU scan barcode.
 */
export function ScanHero() {
  return (
    <Link
      href={SCAN_PAGE_HREF}
      className="block rounded-3xl bg-gradient-to-br from-brand-600 to-brand-500 p-5 shadow-lg shadow-brand-600/25 ring-1 ring-white/20 transition-opacity active:opacity-90"
    >
      <span className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30">
          <Icon name="barcode" className="h-9 w-9" />
        </span>
        <span className="min-w-0 flex-1 text-white">
          <span className="block text-lg font-bold leading-snug">Mulai Jualan</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-white/85">
            Ketik nama barang atau scan barcode — catat bon sekali jalan
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
          <Icon name="chevronRight" className="h-5 w-5" />
        </span>
      </span>
    </Link>
  );
}
