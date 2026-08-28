import type { Metadata } from "next";
import { PRODUCT_UNITS } from "@/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseNotice } from "@/components/ui/PhaseNotice";
import { SectionCard } from "@/components/ui/SectionCard";

export const metadata: Metadata = {
  title: "Produk",
};

export default function ProdukPage() {
  return (
    <>
      <PageHeader
        iconName="box"
        title="Produk"
        subtitle="Daftar barang, harga, dan stok warung"
      />
      <div className="space-y-4">
        <PhaseNotice
          phase={3}
          title="Manajemen produk menyusul"
          description="Pembuatan produk, pemindaian barcode, dan pengelolaan harga dibangun pada Tahap 3 — di atas kontrak data produk dan penyimpanan lokal yang sudah tersedia."
          points={[
            "Tambah produk dengan atau tanpa barcode",
            "Scan barcode — produk dikenali otomatis",
            "Stok awal dan satuan jual tercatat rapi",
            "Setiap perubahan harga meninggalkan riwayat",
          ]}
        />
        <SectionCard title="Satuan jual yang sudah didukung fondasi data">
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_UNITS.map((unit) => (
              <span
                key={unit}
                className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-600"
              >
                {unit}
              </span>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
