import type { Metadata } from "next";
import { ProductsScreen } from "@/components/products/ProductsScreen";
import { PageHeader } from "@/components/ui/PageHeader";

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
      <ProductsScreen />
    </div>
  );
}
