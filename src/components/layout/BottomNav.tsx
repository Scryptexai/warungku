"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV_ITEMS } from "@/config/nav";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Navigasi bawah utama — pola aplikasi dompet digital:
 * 5 tab, ikon jelas, target sentuh besar, indikator aktif berbentuk pil.
 */
function resolveActiveHref(pathname: string): string {
  // Scan & profil diakses dari Beranda — pertahankan tab Beranda tetap aktif.
  if (pathname === "/" || pathname.startsWith("/scan") || pathname.startsWith("/profil")) {
    return "/";
  }
  const match = BOTTOM_NAV_ITEMS.find(
    (item) =>
      item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  return match?.href ?? "";
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const activeHref = resolveActiveHref(pathname);

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white pb-safe"
    >
      <div className="mx-auto grid w-full max-w-lg grid-cols-5">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-1.5",
                active ? "text-brand-700" : "text-stone-400",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full",
                  active ? "bg-brand-100" : "",
                )}
              >
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
