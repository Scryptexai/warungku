import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

/** Kepala halaman standar: ikon + judul + subjudul + aksi opsional di kanan. */
export function PageHeader({
  iconName,
  title,
  subtitle,
  action,
}: {
  iconName?: IconName;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-4 flex items-center gap-3">
      {iconName ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon name={iconName} className="h-6 w-6" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold leading-tight text-stone-900">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm leading-snug text-stone-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
