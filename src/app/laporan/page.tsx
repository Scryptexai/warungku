import type { Metadata } from "next";
import { ReportsScreen } from "@/components/reports/ReportsScreen";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Laporan",
};

export default function LaporanPage() {
  return (
    <div className="px-4 pb-24 pt-5">
      <PageHeader
        iconName="chart"
        title="Laporan"
        subtitle="Ringkasan penjualan harian, mingguan, dan bulanan"
      />
      <ReportsScreen />
      <p className="mt-4 text-center text-[11px] text-stone-400">
        Laporan dihitung otomatis dari data transaksi — aktif di Tahap 4
      </p>
    </div>
  );
}
