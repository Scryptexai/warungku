"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LEFT_NAV_ITEMS, RIGHT_NAV_ITEMS, SCAN_HREF } from "@/config/nav";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * NAVIGASI BAWAH — pola dompet digital:
 * tombol SCAN besar & menonjol di TENGAH (aksi utama aplikasi), diapit
 * tab Beranda/Transaksi (kiri) dan Laporan/AI (kanan).
 * Layar scan tampil penuh tanpa navigasi agar immersion kamera maksimal.
 */

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/profil");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-1 px-1",
        active ? "text-brand-700" : "text-stone-400",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-12 items-center justify-center rounded-full",
          active ? "bg-brand-100" : "",
        )}
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="text-[11px] font-semibold leading-none">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  // Layar scan adalah layar penuh — navigasi disembunyikan di sana.
  if (pathname === "/scan" || pathname.startsWith("/scan/")) {
    return null;
  }

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white pb-safe"
    >
      <div className="relative mx-auto grid w-full max-w-lg grid-cols-5">
        {LEFT_NAV_ITEMS.map((item) => (
          <TabItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(pathname, item.href)}
          />
        ))}

        {/* Tombol SCAN tengah — besar & mencolok, gaya aplikasi dompet digital */}
        <div className="relative flex h-14 items-end justify-center">
          <Link
            href={SCAN_HREF}
            aria-label="Scan barcode — mulai transaksi"
            className="absolute -top-7 left-1/2 flex h-16 w-16 -translate-x-1/2 flex-col items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-xl shadow-brand-600/40 ring-4 ring-white transition-transform active:scale-95"
          >
            <Icon name="barcode" className="h-7 w-7" />
            <span className="mt-0.5 text-[9px] font-extrabold tracking-widest">SCAN</span>
          </Link>
        </div>

        {RIGHT_NAV_ITEMS.map((item) => (
          <TabItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(pathname, item.href)}
          />
        ))}
      </div>
    </nav>
  );
}
