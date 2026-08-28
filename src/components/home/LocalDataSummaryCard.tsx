"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { describeSyncStatus } from "@/components/ui/sync-status";
import { Icon } from "@/components/ui/icons";
import {
  readLocalDataSummary,
  type LocalDataSummary,
} from "@/services/local-data.service";
import type { SyncStatusSnapshot } from "@/domain";

/**
 * Kartu Beranda: ringkasan isi penyimpanan lokal (pembuktian bahwa lapisan
 * persistensi lokal benar-benar hidup) + status koneksi Google Sheets.
 */
export function LocalDataSummaryCard() {
  const { localStore, sync } = useApp();
  const [summary, setSummary] = useState<LocalDataSummary | null>(null);
  const [status, setStatus] = useState<SyncStatusSnapshot>(() => sync.getStatus());

  useEffect(() => {
    let active = true;
    void readLocalDataSummary(localStore).then((result) => {
      if (active) setSummary(result);
    });
    setStatus(sync.getStatus());
    const unsubscribe = sync.subscribe(setStatus);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [localStore, sync]);

  const statusView = describeSyncStatus(status);

  const stats: Array<{ label: string; value: number | undefined }> = [
    { label: "Produk tersimpan", value: summary?.cachedProducts },
    { label: "Pelanggan tersimpan", value: summary?.cachedCustomers },
    { label: "Transaksi tertunda", value: summary?.pendingTransactions },
    { label: "Antrean sinkron", value: summary?.queuedSyncOperations },
  ];

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-bold text-stone-900">Data di Perangkat Ini</h2>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-stone-50 p-3">
            {stat.value === undefined ? (
              <div className="h-7 w-10 animate-pulse rounded bg-stone-200" aria-hidden="true" />
            ) : (
              <p className="text-xl font-bold text-stone-900">{stat.value}</p>
            )}
            <p className="mt-0.5 text-[11px] leading-snug text-stone-500">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-stone-300 p-3">
        <Icon name="cloudOff" className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
        <p className="text-xs leading-relaxed text-stone-500">
          Google Sheets belum terhubung (status: {statusView.label.toLowerCase()}).
          Semua data tetap aman tersimpan di perangkat ini dan akan dikirim
          otomatis setelah koneksi dibuat di{" "}
          <Link href="/pengaturan" className="font-semibold text-brand-700 underline">
            Pengaturan
          </Link>{" "}
          pada Tahap 2.
        </p>
      </div>
    </section>
  );
}
