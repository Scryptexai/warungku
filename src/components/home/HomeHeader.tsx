"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { Icon } from "@/components/ui/icons";
import { DEFAULT_SHOP_NAME, readShopProfile } from "@/services/store-profile.service";

/**
 * Kepala Beranda — pola dompet digital: identitas warung di atas layar,
 * dengan latar gradien merek. Ketuk untuk membuka profil warung.
 */
export function HomeHeader() {
  const { localStore } = useApp();
  const [shopName, setShopName] = useState(DEFAULT_SHOP_NAME);

  useEffect(() => {
    let active = true;
    void readShopProfile(localStore).then((profile) => {
      if (active) setShopName(profile.name);
    });
    return () => {
      active = false;
    };
  }, [localStore]);

  return (
    <header className="rounded-b-[1.75rem] bg-gradient-to-b from-brand-700 to-brand-600 px-4 pb-12 pt-5 text-white">
      <Link
        href="/profil"
        className="flex items-center gap-3 rounded-2xl p-1 active:bg-white/10"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-base font-bold ring-1 ring-white/25">
          {shopName.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{shopName}</span>
          <span className="block text-[11px] text-white/70">Lihat profil warung</span>
        </span>
        <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-white/70" />
      </Link>
      <p className="mt-6 text-[13px] font-medium text-white/85">Selamat berjualan! 👋</p>
    </header>
  );
}
