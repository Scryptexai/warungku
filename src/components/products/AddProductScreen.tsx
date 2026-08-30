"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { Product } from "@/domain";
import { ProductForm } from "./ProductForm";

/**
 * Layar TAMBAH PRODUK.
 * Pintu masuk:
 * - Dari daftar produk (biasa).
 * - Dari alur scan (?alur=scan): barcode terisi; bila barcode dikenali di
 *   database produk (master offline / Open Food Facts), nama, kategori,
 *   harga rekomendasi, dan satuan juga sudah terisi — tinggal cek & simpan.
 * Setelah simpan: kembali ke transaksi dengan produk masuk keranjang.
 */
export function AddProductScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scannedBarcode = searchParams.get("barcode") ?? "";
  const fromScan = searchParams.get("alur") === "scan";
  const suggestedName = searchParams.get("nama") ?? "";
  const suggestedCategory = searchParams.get("kategori") ?? "";
  const suggestedPrice = searchParams.get("harga") ?? "";
  const suggestedUnit = searchParams.get("satuan") ?? "";

  const handleSaved = useCallback(
    (product: Product) => {
      if (fromScan) {
        router.replace(`/scan?added=${encodeURIComponent(product.id)}`);
        return;
      }
      router.replace("/produk");
    },
    [router, fromScan],
  );

  return (
    <ProductForm
      mode="create"
      initialBarcode={scannedBarcode}
      initialName={suggestedName}
      initialCategory={suggestedCategory}
      initialPrice={suggestedPrice}
      initialUnit={suggestedUnit}
      cancelHref={fromScan ? "/scan" : "/produk"}
      onSaved={handleSaved}
    />
  );
}
