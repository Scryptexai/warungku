import type { Metadata } from "next";
import { ProductsScreen } from "@/components/products/ProductsScreen";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseNotice } from "@/components/ui/PhaseNotice";

export const metadata: Metadata = {
  title: "Produk",
};

export default function ProdukPage() {
  return (
    <div className="px-4 pb-24 pt-5">
      <PageHeader
        iconName="box"
        title="Produk"
        subtitle="Daftar barang, harga, dan stok warung"
      />
      <div className="space-y-4">
        <ProductsScreen />
        <PhaseNotice
          phase={2}
          title="Menu Produk aktif di Tahap 2"
          description="Sistem produk & barcode dibangun di Tahap 2 — tepat di atas kerangka layar ini."
          points={[
            "Scan barcode — produk dikenali otomatis",
            "Barang baru? Form produk sederhana muncul sendiri",
            "Cukup isi produk satu kali, gunakan selamanya",
            "Harga mudah diubah kapan saja karena harga bisa naik",
          ]}
        />
      </div>
    </div>
  );
}
