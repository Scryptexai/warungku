import type { Metadata } from "next";
import { EditProductScreen } from "@/components/products/EditProductScreen";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Edit Produk",
};

export default function UbahProdukPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return UbahProdukContent(params);
}

async function UbahProdukContent(params: Promise<{ id: string }>) {
  const { id } = await params;
  return (
    <div className="px-4 pb-24 pt-5">
      <PageHeader
        iconName="box"
        title="Edit Produk"
        subtitle="Ubah nama, kategori, harga, atau stok"
      />
      <EditProductScreen productId={id} />
    </div>
  );
}
