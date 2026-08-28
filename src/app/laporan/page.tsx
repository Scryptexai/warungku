import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseNotice } from "@/components/ui/PhaseNotice";

export const metadata: Metadata = {
  title: "Laporan",
};

export default function LaporanPage() {
  return (
    <>
      <PageHeader
        iconName="chart"
        title="Laporan"
        subtitle="Omzet dan performa warung"
      />
      <div className="space-y-4">
        <PhaseNotice
          phase={5}
          title="Pelaporan menyusul"
          description="Laporan dibangun pada Tahap 5 langsung di atas kontrak ReportsData yang sudah ditetapkan pada fondasi ini."
          points={[
            "Laporan harian, mingguan, dan bulanan",
            "Ringkasan omzet, pembayaran tunai, dan bon",
            "Produk terlaris dan stok menipis",
            "Ekspor CSV dan PDF",
          ]}
        />
      </div>
    </>
  );
}
