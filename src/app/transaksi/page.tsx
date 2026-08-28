import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseNotice } from "@/components/ui/PhaseNotice";

export const metadata: Metadata = {
  title: "Transaksi",
};

export default function TransaksiPage() {
  return (
    <>
      <PageHeader
        iconName="receipt"
        title="Transaksi"
        subtitle="Riwayat penjualan warung"
      />
      <div className="space-y-4">
        <PhaseNotice
          phase={4}
          title="Riwayat transaksi menyusul"
          description="Transaksi mulai tercatat dari layar kasir pada Tahap 4; pencarian dan filter riwayat lengkap hadir pada Tahap 5."
          points={[
            "Setiap transaksi tercatat dengan waktu dan detail item",
            "Tersimpan dulu di perangkat, lalu tersinkron ke Google Sheets",
            "Pencarian & filter riwayat (Tahap 5)",
          ]}
        />
      </div>
    </>
  );
}
