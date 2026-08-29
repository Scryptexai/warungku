"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_SHOP_NAME,
  readShopProfile,
  saveShopProfile,
} from "@/services/store-profile.service";

/**
 * Form profil warung — satu-satunya tempat mengetik yang wajib di Tahap 1.
 * Disimpan di perangkat (LocalStore); nanti tertaut ke Google Sheets (Tahap 4).
 */
export function ProfileForm() {
  const { localStore } = useApp();
  const { applyProfile } = useCatalog();
  const [name, setName] = useState(DEFAULT_SHOP_NAME);
  const [owner, setOwner] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void readShopProfile(localStore).then((profile) => {
      if (!active) return;
      setName(profile.name);
      setOwner(profile.ownerName ?? "");
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [localStore]);

  async function handleSave() {
    await saveShopProfile(localStore, { name, ownerName: owner }).then(applyProfile);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  const displayName = name.trim() || DEFAULT_SHOP_NAME;

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-stone-900">{displayName}</h2>
          <p className="truncate text-xs text-stone-500">
            {owner.trim() ? `Pemilik: ${owner.trim()}` : "Nama pemilik belum diisi"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-stone-600">
            Nama Warung
          </span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
            maxLength={40}
            placeholder="cth. Warung Bu Sari"
            className="min-h-12 w-full rounded-xl border border-stone-200 px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-stone-600">
            Nama Pemilik <span className="font-normal text-stone-400">(opsional)</span>
          </span>
          <input
            value={owner}
            onChange={(event) => {
              setOwner(event.target.value);
              setSaved(false);
            }}
            maxLength={40}
            placeholder="cth. Bu Sari"
            className="min-h-12 w-full rounded-xl border border-stone-200 px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400"
          />
        </label>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={!ready}>
            Simpan
          </Button>
          {saved ? (
            <span className="text-xs font-semibold text-brand-700" role="status">
              Tersimpan ✓
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
