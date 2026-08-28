import { SyncStatusPill } from "./SyncStatusPill";

/** Bilah atas aplikasi: identitas + status sinkronisasi. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            W
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold text-stone-900">Warungku</p>
            <p className="truncate text-[11px] text-stone-500">Kasir &amp; Asisten Warung</p>
          </div>
        </div>
        <SyncStatusPill />
      </div>
    </header>
  );
}
