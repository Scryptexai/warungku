import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Warungku",
  title: {
    default: "Warungku — Kasir & Asisten Warung",
    template: "%s · Warungku",
  },
  description:
    "Aplikasi kasir (POS) dan asisten bisnis AI untuk warung dan toko kelontong Indonesia. Data warung tersimpan aman di Google Sheets milik warung sendiri.",
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
