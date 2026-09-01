import type { Metadata } from "next";
import { Suspense } from "react";
import { AddProductScreen } from "@/components/products/AddProductScreen";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Tambah Produk",
};

export default function TambahProdukPage() {
  return (
    <div className="px-4 pb-24 pt-5">
      <PageHeader
        iconName="plus"
        title="Tambah Produk"
        subtitle="Cukup daftarkan sekali — scan berikutnya langsung dikenali"
      />
      <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-white ring-1 ring-stone-900/5" />}>
        <AddProductScreen />
      </Suspense>
    </div>
  );
}
