"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { Product } from "@/domain";
import { ProductForm } from "./ProductForm";

/**
 * Layar TAMBAH PRODUK.
 * Dua pintu masuk:
 * - Dari daftar produk (biasa).
 * - Dari alur scan (?alur=scan): barcode hasil scan sudah terisi; setelah
 *   disimpan, kembali ke transaksi dengan produk langsung masuk keranjang.
 */
export function AddProductScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scannedBarcode = searchParams.get("barcode") ?? "";
  const fromScan = searchParams.get("alur") === "scan";

  const handleSaved = useCallback(
    (product: Product) => {
      if (fromScan) {
        // Kembali ke transaksi — produk baru otomatis masuk keranjang.
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
      cancelHref={fromScan ? "/scan" : "/produk"}
      onSaved={handleSaved}
    />
  );
}
