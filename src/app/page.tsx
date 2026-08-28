import type { Metadata } from "next";
import { LocalDataSummaryCard } from "@/components/home/LocalDataSummaryCard";
import { MenuTile } from "@/components/ui/MenuTile";
import { PageHeader } from "@/components/ui/PageHeader";
import { CURRENT_PHASE, TOTAL_ROADMAP_PHASES } from "@/config/app";
import { ALL_AREA_ITEMS } from "@/config/nav";

export const metadata: Metadata = {
  title: "Beranda",
};

export default function BerandaPage() {
  return (
    <>
      <PageHeader
        iconName="shop"
        title="Beranda"
        subtitle="Ringkasan warung Anda"
      />
      <div className="space-y-4">
        <LocalDataSummaryCard />
        <section aria-labelledby="menu-utama">
          <h2 id="menu-utama" className="mb-2 px-0.5 text-sm font-bold text-stone-500">
            Menu Utama
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {ALL_AREA_ITEMS.map((item) => (
              <MenuTile key={item.href} item={item} />
            ))}
          </div>
        </section>
        <p className="pt-2 text-center text-[11px] text-stone-400">
          Warungku · Tahap {CURRENT_PHASE} dari {TOTAL_ROADMAP_PHASES} — Fondasi
        </p>
      </div>
    </>
  );
}
