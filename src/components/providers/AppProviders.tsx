"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { CartProvider } from "./CartProvider";
import { createAppContainer, type AppContainer } from "@/services/container";

/**
 * Penyedia container aplikasi (composition root) ke seluruh pohon React.
 * UI hanya melihat layanan lewat context ini — tidak pernah storage/repository
 * secara langsung.
 */
const AppContainerContext = createContext<AppContainer | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  const containerRef = useRef<AppContainer | null>(null);
  if (containerRef.current === null) {
    containerRef.current = createAppContainer();
  }
  const container = containerRef.current;

  useEffect(() => {
    // Memuat antrean/status tersimpan + memasang pendengar online/offline.
    void container.syncEngine.init();
  }, [container]);

  return (
    <AppContainerContext.Provider value={container}>
      <CartProvider>{children}</CartProvider>
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
