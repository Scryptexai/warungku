import { BrowserLocalStore } from "./browser-local-store";
import { MemoryLocalStore } from "./memory-local-store";
import type { LocalStore } from "./local-store";

export type { LocalStore, LocalStoreKey } from "./local-store";
export { LOCAL_STORE_KEYS } from "./local-store";
export { BrowserLocalStore, MemoryLocalStore };

/**
 * Pabrik LocalStore sesuai lingkungan eksekusi:
 * - Peramban  → localStorage (data bertahan antar sesi).
 * - Server/SSR → memori (cukup untuk render awal; klien mengambil alih saat
 *   hidrasi).
 */
export function createLocalStore(): LocalStore {
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    return new BrowserLocalStore(window.localStorage);
  }
  return new MemoryLocalStore();
}
