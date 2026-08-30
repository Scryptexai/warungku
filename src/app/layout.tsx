import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Warungku — Kasir Warung",
    template: "%s · Warungku",
  },
  description:
    "Kasir mobile-first untuk warung dan toko kelontong Indonesia. Mulai jualan cukup dengan scan barcode — tunai atau bon — data warung tersimpan di Google Sheets milik Anda sendiri.",
  manifest: "/manifest.webmanifest",
  applicationName: "Warungku",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Warungku",
  },
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
