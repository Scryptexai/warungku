"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { ProductForm } from "./ProductForm";

/**
 * Layar TAMBAH PRODUK.
 * Bisa dibuka langsung, atau dari alur scan: barcode hasil scan sudah
 * terisi otomatis — pemilik cukup melengkapi nama, kategori, harga, stok.
 */
export function AddProductScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scannedBarcode = searchParams.get("barcode") ?? "";

  const handleSaved = useCallback(
    () => {
      // Kembali ke daftar — produk baru langsung terlihat di paling atas.
      router.replace("/produk");
    },
    [router],
  );

  return (
    <ProductForm
      mode="create"
      initialBarcode={scannedBarcode}
      cancelHref="/produk"
      onSaved={handleSaved}
    />
  );
}
