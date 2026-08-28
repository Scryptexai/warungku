import type { Metadata } from "next";
import { FlowSteps } from "@/components/ui/FlowSteps";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseNotice } from "@/components/ui/PhaseNotice";
import { SectionCard } from "@/components/ui/SectionCard";

export const metadata: Metadata = {
  title: "Kasir",
};

export default function KasirPage() {
  return (
    <>
      <PageHeader
        iconName="cart"
        title="Kasir"
        subtitle="Catat penjualan dengan cepat"
      />
      <div className="space-y-4">
        <PhaseNotice
          phase={4}
          title="Layar kasir menyusul"
          description="Alur kasir lengkap dibangun pada Tahap 4. Kontrak data transaksi dan arsitektur penyimpanannya sudah siap pada fondasi ini."
          points={[
            "Scan barcode — barang langsung masuk keranjang",
            "Bayar tunai atau bon, cukup satu tombol",
            "Stok dan saldo bon pelanggan terpotong otomatis",
            "Transaksi tetap tersimpan walau jaringan putus",
          ]}
        />
        <SectionCard title="Alur transaksi yang direncanakan">
          <FlowSteps steps={["Scan barcode", "Keranjang", "Tunai / Bon", "Selesai"]} />
        </SectionCard>
      </div>
    </>
  );
}
