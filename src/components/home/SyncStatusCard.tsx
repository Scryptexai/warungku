"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { Icon } from "@/components/ui/icons";
import type { SyncStatusSnapshot } from "@/domain";
import { cn } from "@/lib/cn";

/**
 * Kartu SINKRONISASI di Beranda — jendela ke arsitektur offline-first:
 * - database utama = perangkat ini (selalu bisa jualan),
 * - Google Sheets = CADANGAN; kirim otomatis saat online,
 * - tombol SINKRONKAN untuk kirim + tarik manual,
 * - konflik/gagal → pesan Indonesia sederhana + coba lagi.
 */
export function SyncStatusCard() {
  const { sync } = useApp();
  const { profile, refreshFromSheets } = useCatalog();
  const [status, setStatus] = useState<SyncStatusSnapshot | null>(null);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(sync.getStatus());
    const unsubscribe = sync.subscribe(setStatus);
    return unsubscribe;
  }, [sync]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = (): void => setOnline(true);
    const down = (): void => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const handleSync = useCallback(async () => {
    setBusy(true);
    try {
      await sync.syncNow(); // kirim antrean → Sheets
      await refreshFromSheets(true); // tarik backup → perangkat
    } catch {
      // Pesan status sudah digarap lewat status engine.
    } finally {
      setBusy(false);
    }
  }, [sync, refreshFromSheets]);

  const connected = Boolean(profile?.spreadsheetId);
  const queued = status?.queuedCount ?? 0;
  const working = busy || status?.state === "SYNCING";
  const hasError = status?.state === "ERROR" && queued > 0;

  const label = !connected
    ? "Cadangan Google Sheets belum terhubung"
    : working
      ? "Menyinkronkan…"
      : hasError
        ? "Ada data belum terkirim"
        : !online
          ? "Offline — data aman di perangkat ini"
          : queued > 0
            ? `${queued} perubahan menunggu dikirim`
            : status?.lastSyncedAt
              ? `Tersinkron ${new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(
                  new Date(status.lastSyncedAt),
                )}`
              : "Siap sinkron";

  return (
    <section
      aria-label="Status sinkronisasi"
      className={cn(
        "rounded-2xl p-4 ring-1",
        hasError
          ? "bg-amber-50 ring-amber-200"
          : connected
            ? "bg-white ring-stone-900/5"
            : "bg-stone-50 ring-stone-200",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            hasError
              ? "bg-amber-100 text-amber-600"
              : connected
                ? "bg-brand-50 text-brand-700"
                : "bg-stone-200 text-stone-500",
          )}
        >
          <Icon
            name={connected ? (working ? "sync" : "cloud") : "cloudOff"}
            className={cn("h-5 w-5", working && "animate-spin")}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-stone-800">{label}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
            {connected
              ? "Data utama tersimpan di perangkat ini — Sheets hanyalah cadangan."
              : "Jualan tetap jalan tanpa cadangan. Hubungkan di Profil untuk aman."}
          </p>
        </div>
        {connected ? (
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={working}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 text-xs font-bold text-white active:opacity-80 disabled:opacity-50"
          >
            <Icon name="sync" className={cn("h-4 w-4", working && "animate-spin")} />
            Sinkronkan
          </button>
        ) : (
          <Link
            href="/profil"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white px-3 text-xs font-bold text-stone-700"
          >
            Hubungkan
          </Link>
        )}
      </div>

      {hasError && status?.lastError ? (
        <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          Gagal mengirim ke Google Sheets: {status.lastError}. Data TETAP aman
          di perangkat ini dan akan dikirim ulang otomatis — atau tekan
          Sinkronkan saat internet kembali.
        </p>
      ) : null}
    </section>
  );
}
