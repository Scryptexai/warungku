"use client";

import { useEffect } from "react";

/**
 * Pasang service worker (PWA) — supaya Warungku BISA DIBUKA OFFLINE.
 * Dipasang hanya di browser (bukan dev-tools iframe) dan setelah halaman
 * aktif, agar tidak mengganggu navigasi pertama.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = (): void => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error: unknown) => {
          console.info(
            "[warungku] Service worker tidak terpasang (abaikan bila bukan HTTPS / mode embed).",
            error,
          );
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
