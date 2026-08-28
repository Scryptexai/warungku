import Link from "next/link";
import type { NavItem } from "@/config/nav";
import { Icon } from "./icons";

/** Kartu menu besar untuk kisi Beranda — target sentuh lega. */
export function MenuTile({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className="flex min-h-28 flex-col justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 transition-colors active:bg-stone-50"
    >
      <span className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon name={item.icon} className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
          Tahap {item.phase}
        </span>
      </span>
      <span>
        <span className="block text-sm font-bold text-stone-900">{item.label}</span>
        <span className="mt-0.5 block text-xs leading-snug text-stone-500">
          {item.description}
        </span>
      </span>
    </Link>
  );
}
