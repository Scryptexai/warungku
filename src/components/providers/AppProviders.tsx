"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { CartProvider } from "./CartProvider";
import { CatalogProvider } from "./CatalogProvider";
import { createAppContainer, type AppContainer } from "@/services/container";

/**
 * Penyedia container aplikasi (composition root) ke seluruh pohon React.
 * UI hanya melihat layanan lewat context ini — tidak pernah storage/repository
 * secara langsung.
 */
const AppContainerContext = createContext<AppContainer | null>(null);

/** Rute utama yang di-pratinjau (prefetch) saat aplikasi senggang. */
const PREFETCH_ROUTES = ["/produk", "/transaksi", "/laporan", "/ai", "/scan", "/profil"];

export function AppProviders({ children }: { children: ReactNode }) {
  const router = useRouter();
  const containerRef = useRef<AppContainer | null>(null);
  if (containerRef.current === null) {
    containerRef.current = createAppContainer();
  }
  const container = containerRef.current;

  useEffect(() => {
    // Memuat antrean/status tersimpan + memasang pendengar online/offline.
    void container.syncEngine.init();
  }, [container]);

  // Seed katalog kosong dengan master offline barcode-NYATA (idempotent).
  // Pemisahan agar provider layanan cukup murni: provider ini satu-satunya
  // yang memutuskan "kapan" melakukan bootstrap.
  useEffect(() => {
    // §5D: (1) bersihkan barcode sintetis warisan seed 5C (produk tetap,
    //     barcode dinolkan), lalu (2) seed katalog kosong dengan master
    //     barcode-NYATA. Keduanya idempotent.
    void (async () => {
      await container.products.purgeRetiredBarcodes();
      await container.products.seedFromMasterIfEmpty();
    })();
  }, [container]);

  useEffect(() => {
    // PANAS-KAN APLIKASI saat senggang: prefetch semua menu utama + pustaka
    // scanner, sehingga pindah menu & membuka layar scan terasa instan.
    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback
        : (callback: () => void) => window.setTimeout(callback, 400);
    const cancel =
      typeof window.cancelIdleCallback === "function"
        ? window.cancelIdleCallback
        : (handle: number) => window.clearTimeout(handle);

    const handle = idle(() => {
      for (const route of PREFETCH_ROUTES) {
        router.prefetch(route);
      }
      // Pra-muat pustaka ZXing (chunk yang sama dengan yang dipakai scanner).
      void import("@zxing/browser");
      void import("@zxing/library");
    });
    return () => cancel(handle);
  }, [router]);

  return (
    <AppContainerContext.Provider value={container}>
      <CatalogProvider container={container}>
        <CartProvider>{children}</CartProvider>
      </CatalogProvider>
    </AppContainerContext.Provider>
  );
}

/** Akses container aplikasi dari komponen klien. */
export function useApp(): AppContainer {
  const container = useContext(AppContainerContext);
  if (!container) {
    throw new Error("useApp hanya boleh dipakai di dalam <AppProviders>.");
  }
  return container;
}
