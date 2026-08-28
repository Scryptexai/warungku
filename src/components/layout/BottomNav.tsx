"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "@/config/nav";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Navigasi bawah utama (5 item). Halaman menu sekunder (Pelanggan, Laporan,
 * Asisten AI, Pengaturan) menandai tab "Lainnya" sebagai aktif.
 */
function resolveActiveHref(pathname: string): string {
  const secondaryActive = SECONDARY_NAV_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  if (secondaryActive) return "/lainnya";

  const primary = PRIMARY_NAV_ITEMS.find((item) =>
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return primary?.href ?? "";
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const activeHref = resolveActiveHref(pathname);

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-safe backdrop-blur"
    >
      <div className="mx-auto grid w-full max-w-lg grid-cols-5">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2",
                active ? "text-brand-700" : "text-stone-500",
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
