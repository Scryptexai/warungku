import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

/**
 * Cangkang aplikasi mobile-first: lebar konten maksimal seperti ponsel,
 * bilah atas menempel, navigasi bawah besar, konten di tengah.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <TopBar />
      <main id="konten" className="flex-1 px-4 pb-6 pt-4">
        {children}
      </main>
      {/* Ruang agar konten tidak tertutup navigasi bawah yang menempel. */}
      <div className="h-20" aria-hidden="true" />
      <BottomNav />
    </div>
  );
}
