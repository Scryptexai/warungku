import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

/**
 * Keadaan kosong standar (belum ada data) — ramah, tanpa istilah teknis.
 * `imageUrl` opsional: ilustrasi hangat agar layar tidak polos.
 */
export function EmptyState({
  iconName,
  title,
  description,
  imageUrl,
  children,
}: {
  iconName: IconName;
  title: string;
  description?: string;
  imageUrl?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- aset statis lokal (bisa di-cache service worker)
        <img
          src={imageUrl}
          alt=""
          aria-hidden
          className="mb-2 h-28 w-full max-w-[280px] rounded-xl object-cover"
        />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
          <Icon name={iconName} className="h-6 w-6" />
        </span>
      )}
      <p className="text-sm font-bold text-stone-800">{title}</p>
      {description ? (
        <p className="max-w-[30ch] text-xs leading-relaxed text-stone-500">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
