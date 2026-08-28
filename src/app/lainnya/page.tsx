import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { SECONDARY_NAV_ITEMS } from "@/config/nav";

export const metadata: Metadata = {
  title: "Lainnya",
};

export default function LainnyaPage() {
  return (
    <>
      <PageHeader
        iconName="more"
        title="Lainnya"
        subtitle="Menu tambahan Warungku"
      />
      <nav aria-label="Menu lainnya" className="space-y-2.5">
        {SECONDARY_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-16 items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 transition-colors active:bg-stone-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon name={item.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-stone-900">{item.label}</span>
              <span className="block truncate text-xs text-stone-500">
                {item.description}
              </span>
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
              Tahap {item.phase}
            </span>
            <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-stone-400" />
          </Link>
        ))}
      </nav>
    </>
  );
}
