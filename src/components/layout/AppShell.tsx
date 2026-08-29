import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

/**
 * Cangkang aplikasi mobile-first.
 * Lebar konten mengikuti layar ponsel (maks. ~ponsel), navigasi bawah besar
 * menempel di bawah, dan tiap halaman mengatur sendiri padding bawahnya
 * (termasuk halaman khusus seperti layar scan yang melebar penuh).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-stone-50">
      <main id="konten" className="flex-1">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
