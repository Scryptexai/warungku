import type { Store } from "@/domain";
import type { LocalStore } from "@/data/local/local-store";
import { getPublicAppEnv } from "@/config/env";
import { nowISO } from "@/lib/datetime";

/**
 * Layanan profil warung lokal.
 * Nama warung disimpan di perangkat (lewat LocalStore) sehingga Beranda &
 * Profil tetap personal tanpa memerlukan koneksi apa pun.
 * Mulai Tahap 4, profil ini yang kemudian tertaut ke Google Sheets milik
 * warung (tanpa perubahan bentuk data).
 */

export const DEFAULT_SHOP_NAME = "Warung Saya";

function buildDefaultProfile(): Store {
  const env = getPublicAppEnv();
  const now = nowISO();
  return {
    id: "warung-local",
    name: DEFAULT_SHOP_NAME,
    ownerName: null,
    address: null,
    phone: null,
    spreadsheetId: null,
    spreadsheetUrl: null,
    currency: env.defaultCurrency,
    locale: env.defaultLocale,
    timezone: env.defaultTimezone,
    connectedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Membaca profil warung; mengembalikan profil default bila belum pernah disimpan. */
export async function readShopProfile(localStore: LocalStore): Promise<Store> {
  const stored = await localStore.getStoreProfile();
  return stored ?? buildDefaultProfile();
}

/** Menyimpan perubahan nama warung / pemilik ke penyimpanan lokal. */
export async function saveShopProfile(
  localStore: LocalStore,
  input: { name: string; ownerName: string | null },
): Promise<Store> {
  const current = await readShopProfile(localStore);
  const next: Store = {
    ...current,
    name: input.name.trim() || DEFAULT_SHOP_NAME,
    ownerName: input.ownerName?.trim() || null,
    updatedAt: nowISO(),
  };
  await localStore.setStoreProfile(next);
  return next;
}

/** Menandai warung terhubung ke spreadsheet Google Sheets miliknya. */
export async function markSheetsConnected(
  localStore: LocalStore,
  spreadsheetId: string,
  spreadsheetUrl: string,
): Promise<Store> {
  const current = await readShopProfile(localStore);
  const next: Store = {
    ...current,
    spreadsheetId,
    spreadsheetUrl,
    connectedAt: nowISO(),
    updatedAt: nowISO(),
  };
  await localStore.setStoreProfile(next);
  return next;
}

/** Menghapus tautan spreadsheet (mis. setelah memutus koneksi Google). */
export async function markSheetsDisconnected(localStore: LocalStore): Promise<Store> {
  const current = await readShopProfile(localStore);
  const next: Store = {
    ...current,
    spreadsheetId: null,
    spreadsheetUrl: null,
    connectedAt: null,
    updatedAt: nowISO(),
  };
  await localStore.setStoreProfile(next);
  return next;
}
