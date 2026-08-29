"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import type { Product } from "@/domain";
import { ProductForm, type EditableProduct } from "./ProductForm";

/**
 * Layar EDIT PRODUK — nama, kategori, harga, dan stok bisa diubah.
 * Barcode ditampilkan tetapi tidak bisa diubah. Alur paling penting:
 * Cari Produk → Edit Harga → Simpan.
 */
export function EditProductScreen({ productId }: { productId: string }) {
  const { products } = useApp();
  const router = useRouter();
  const [editable, setEditable] = useState<EditableProduct | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let active = true;
    void products.getProductById(productId).then((product: Product | null) => {
      if (!active) return;
      setEditable(
        product
          ? {
              id: product.id,
              barcode: product.barcode,
              name: product.name,
              category: product.category,
              currentPrice: product.currentPrice,
              stock: product.stock,
            }
          : null,
      );
    });
    return () => {
      active = false;
    };
  }, [products, productId]);

  if (editable === undefined) {
    return <div className="h-72 animate-pulse rounded-2xl bg-white ring-1 ring-stone-900/5" />;
  }

  if (editable === null) {
    return (
      <EmptyState
        iconName="box"
        title="Produk tidak ditemukan"
        description="Produk ini mungkin sudah dihapus."
      >
        <LinkButton href="/produk" className="mt-2">
          Kembali ke Daftar Produk
        </LinkButton>
      </EmptyState>
    );
  }

  return (
    <ProductForm
      mode="edit"
      product={editable}
      cancelHref={`/produk/${productId}`}
      onSaved={() => router.replace(`/produk/${productId}`)}
    />
  );
}
