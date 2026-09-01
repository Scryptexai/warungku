import type { Metadata } from "next";
import { ProductDetailScreen } from "@/components/products/ProductDetailScreen";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Detail Produk",
};

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return ProductDetailContent(params);
}

async function ProductDetailContent(params: Promise<{ id: string }>) {
  const { id } = await params;
  return (
    <div className="px-4 pb-24 pt-5">
      <PageHeader iconName="box" title="Detail Produk" subtitle="Informasi produk warung" />
      <ProductDetailScreen productId={id} />
    </div>
  );
}
