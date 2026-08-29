import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Warungku",
  title: {
    default: "Warungku — Kasir Warung",
    template: "%s · Warungku",
  },
  description:
    "Kasir mobile-first untuk warung dan toko kelontong Indonesia. Mulai jualan cukup dengan scan barcode — tunai atau bon — data warung tersimpan di Google Sheets milik Anda sendiri.",
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
      </body>
    </html>
  );
}
