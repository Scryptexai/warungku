import type { Metadata } from "next";
import { ImportProductsScreen } from "@/components/products/ImportProductsScreen";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Impor Produk",
};

export default function ImporProdukPage() {
  return (
    <div className="px-4 pb-24 pt-5">
      <PageHeader
        iconName="upload"
        title="Impor Produk"
        subtitle="Tambah banyak produk sekaligus dari file CSV master milik Anda"
      />
      <ImportProductsScreen />
    </div>
  );
}
