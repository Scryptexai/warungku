import { Icon, type IconName } from "./icons";

/** Kepala halaman standar: ikon + judul + subjudul. */
export function PageHeader({
  iconName,
  title,
  subtitle,
}: {
  iconName: IconName;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-4 flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
        <Icon name={iconName} className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <h1 className="text-xl font-bold leading-tight text-stone-900">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm leading-snug text-stone-500">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}
