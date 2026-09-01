"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { ProductForm, type EditableProduct } from "./ProductForm";

/**
 * Layar EDIT PRODUK — nama, kategori, harga, stok, dan satuan bisa diubah.
 * Barcode ditampilkan tetapi tidak bisa diubah. Data dari cache sesi.
 */
export function EditProductScreen({ productId }: { productId: string }) {
  const router = useRouter();
  const { products: productsService } = useApp();
  const { products, ensureLocal } = useCatalog();
  const [editable, setEditable] = useState<EditableProduct | null | undefined>(
    undefined,
  );
  // §7: batas stok menipis (preferensi lokal pemilik, bukan data produk).
  const [threshold, setThreshold] = useState<number | null>(null);

  useEffect(() => {
    void ensureLocal();
  }, [ensureLocal]);

  useEffect(() => {
    let active = true;
    void productsService
      .getLowStockThresholds()
      .then((all) => active && setThreshold(all[productId] ?? null));
    return () => {
      active = false;
    };
  }, [productsService, productId]);

  useEffect(() => {
    if (products === null) return; // masih memuat
    const product = products.find((item) => item.id === productId);
    setEditable(
      product
        ? {
            id: product.id,
            barcode: product.barcode,
            name: product.name,
            category: product.category,
            currentPrice: product.currentPrice,
            stock: product.stock,
            unit: product.unit,
          }
        : null,
    );
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
      lowStockThreshold={{
        value: threshold,
        onSave: async (next) => {
          await productsService.setLowStockThreshold(productId, next);
          setThreshold(next);
        },
      }}
    />
  );
}
