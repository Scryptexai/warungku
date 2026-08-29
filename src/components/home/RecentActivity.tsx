import Link from "next/link";
import { Icon } from "@/components/ui/icons";

/**
 * Aktivitas terakhir di Beranda — transaksi baru akan muncul di sini
 * setelah kasir aktif (Tahap 3). Saat ini: keadaan kosong yang rapi.
 */
export function RecentActivity() {
  return (
    <section
      aria-label="Aktivitas terakhir"
      className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-stone-900">Aktivitas Terakhir</h2>
        <Link href="/transaksi" className="text-xs font-semibold text-brand-700">
          Lihat Semua
        </Link>
      </div>
      <div className="mt-3 flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-stone-200 px-3 py-6 text-center">
        <Icon name="receipt" className="h-7 w-7 text-stone-300" />
        <p className="text-sm font-semibold text-stone-700">Belum ada transaksi</p>
        <p className="max-w-[32ch] text-xs leading-relaxed text-stone-500">
          Transaksi akan muncul di sini setelah Anda mulai berjualan dengan scan
          barcode.
        </p>
      </div>
    </section>
  );
}
