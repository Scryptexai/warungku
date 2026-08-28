import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseNotice } from "@/components/ui/PhaseNotice";

export const metadata: Metadata = {
  title: "Pelanggan",
};

export default function PelangganPage() {
  return (
    <>
      <PageHeader
        iconName="users"
        title="Pelanggan"
        subtitle="Pelanggan langganan dan bon warung"
      />
      <div className="space-y-4">
        <PhaseNotice
          phase={4}
          title="Kelola pelanggan & bon menyusul"
          description="Pencatatan pelanggan terhubung ke alur kasir pada Tahap 4, dan pencarian pelanggan cepat hadir pada Tahap 5. Kontrak data pelanggan (termasuk saldo bon) sudah ditetapkan."
          points={[
            "Simpan pelanggan langganan beserta nomor HP",
            "Catat bon dan pantau saldo piutang tiap pelanggan",
            "Pencarian pelanggan cepat (Tahap 5)",
          ]}
        />
      </div>
    </>
  );
}
