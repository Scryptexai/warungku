"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Customer, Product, Store } from "@/domain";
import type { AppContainer } from "@/services/container";
import { readShopProfile } from "@/services/store-profile.service";

/**
 * CACHE KATALOG SESI — kunci navigasi cepat.
 *
 * Data (produk/pelanggan/profil) dimuat SEKALI per sesi lalu dipegang di
 * memori React, sehingga pindah menu TIDAK memuat ulang apa pun:
 * - kunjungan pertama: baca penyimpanan perangkat (sekali),
 * - kunjungan berikutnya: instan dari memori (tanpa skeleton),
 * - Google Sheets ditarik di belakang maksimal 1× per menit (TTL),
 * - perubahan (tambah/edit produk, transaksi) diterapkan langsung
 *   (optimistic) lewat apply*.
 */

/** Seberapa sering katalog otomatis ditarik ulang dari Google Sheets. */
export const SHEETS_REFRESH_TTL_MS = 60_000;

export interface CatalogContextValue {
  products: Product[] | null;
  customers: Customer[] | null;
  profile: Store | null;
  /** Waktu terakhir katalog berhasil ditarik dari Google Sheets (epoch ms). */
  lastSheetsFetchAt: number | null;
  /** Memuat dari penyimpanan perangkat — sekali per sesi (murah). */
  ensureLocal(): Promise<void>;
  /** Membaca ulang penyimpanan perangkat (mis. setelah transaksi). */
  reloadLocal(): Promise<void>;
  /** Menarik katalog terbaru dari Google Sheets (dibatasi TTL kecuali force). */
  refreshFromSheets(force?: boolean): Promise<void>;
  applyProduct(product: Product): void;
  applyCustomer(customer: Customer): void;
  applyProfile(profile: Store): void;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({
  container,
  children,
}: {
  container: AppContainer;
  children: ReactNode;
}) {
  const { localStore, repository } = container;
  const [products, setProducts] = useState<Product[] | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [profile, setProfile] = useState<Store | null>(null);
  const [lastSheetsFetchAt, setLastSheetsFetchAt] = useState<number | null>(null);
  const localLoadedRef = useRef(false);
  const fetchingRef = useRef(false);

  const ensureLocal = useCallback(async () => {
    if (localLoadedRef.current) return;
    localLoadedRef.current = true;
    const [cachedProducts, cachedCustomers, shopProfile] = await Promise.all([
      localStore.getCachedProducts(),
      localStore.getCachedCustomers(),
      readShopProfile(localStore),
    ]);
    setProducts(cachedProducts);
    setCustomers(cachedCustomers);
    setProfile(shopProfile);
  }, [localStore]);

  const reloadLocal = useCallback(async () => {
    const [cachedProducts, cachedCustomers, shopProfile] = await Promise.all([
      localStore.getCachedProducts(),
      localStore.getCachedCustomers(),
      readShopProfile(localStore),
    ]);
    setProducts(cachedProducts);
    setCustomers(cachedCustomers);
    setProfile(shopProfile);
  }, [localStore]);

  const refreshFromSheets = useCallback(
    async (force = false) => {
      if (
        !force &&
        lastSheetsFetchAt !== null &&
        Date.now() - lastSheetsFetchAt < SHEETS_REFRESH_TTL_MS
      ) {
        return; // masih segar — jangan penuhi jaringan tiap pindah menu
      }
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const fresh = await repository.getProducts();
        await localStore.setCachedProducts(fresh);
        setProducts(fresh);
        setLastSheetsFetchAt(Date.now());
      } catch {
        // Belum terhubung / offline — cache perangkat tetap dipakai (diam).
      } finally {
        fetchingRef.current = false;
      }
    },
    [repository, localStore, lastSheetsFetchAt],
  );

  const applyProduct = useCallback((product: Product) => {
    setProducts((current) => {
      if (current === null) return [product];
      const index = current.findIndex((item) => item.id === product.id);
      if (index === -1) return [product, ...current];
      const next = [...current];
      next[index] = product;
      return next;
    });
  }, []);

  const applyCustomer = useCallback((customer: Customer) => {
    setCustomers((current) => {
      if (current === null) return [customer];
      const index = current.findIndex((item) => item.id === customer.id);
      if (index === -1) return [customer, ...current];
      const next = [...current];
      next[index] = customer;
      return next;
    });
  }, []);

  const applyProfile = useCallback((nextProfile: Store) => {
    setProfile(nextProfile);
  }, []);

  return (
    <CatalogContext.Provider
      value={{
        products,
        customers,
        profile,
        lastSheetsFetchAt,
        ensureLocal,
        reloadLocal,
        refreshFromSheets,
        applyProduct,
        applyCustomer,
        applyProfile,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error("useCatalog hanya boleh dipakai di dalam <CatalogProvider>.");
  }
  return context;
}
