import Link from "next/link";
import { QUICK_ACCESS_ITEMS } from "@/config/nav";
import { Icon } from "@/components/ui/icons";

/**
 * Pintasan ikon di Beranda — pola kisi ikon aplikasi dompet digital:
 * ikon besar + label singkat, satu ketuk langsung ke fungsinya.
 */
export function QuickAccess() {
  return (
    <section aria-label="Akses cepat">
      <h2 className="mb-2 px-0.5 text-sm font-bold text-stone-700">Akses Cepat</h2>
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACCESS_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-2 ring-1 ring-stone-900/5 active:bg-stone-50"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Icon name={item.icon} className="h-6 w-6" />
            </span>
            <span className="text-center text-[11px] font-semibold leading-tight text-stone-700">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
