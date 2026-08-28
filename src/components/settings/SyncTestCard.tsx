"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { FlowSteps } from "@/components/ui/FlowSteps";
import { describeSyncStatus } from "@/components/ui/sync-status";
import type { SyncQueueItem, SyncStatusSnapshot } from "@/domain";

/**
 * Kartu uji arsitektur sinkronisasi (di halaman Pengaturan).
 *
 * Tombol "Uji antrean" memasukkan operasi PING tak-berbahaya. Karena Google
 * Sheets belum terhubung (Tahap 2), operasi TETAP tinggal di antrean —
 * memperagakan alur: gagal/ belum terhubung → tetap di antrean → dicoba
 * ulang saat koneksi siap. Setelah Tahap 2, tombol yang sama akan benar-benar
 * mengirim ke Google Sheets tanpa perubahan kode di komponen ini.
 */
export function SyncTestCard() {
  const { sync } = useApp();
  const [status, setStatus] = useState<SyncStatusSnapshot>(() => sync.getStatus());
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshQueue = useCallback(async () => {
    setQueue(await sync.getQueue());
  }, [sync]);

  useEffect(() => {
    setStatus(sync.getStatus());
    const unsubscribe = sync.subscribe(setStatus);
    void refreshQueue();
    return unsubscribe;
  }, [sync, refreshQueue]);

  async function handleEnqueueTest() {
    setBusy(true);
    try {
      await sync.enqueuePing();
      await refreshQueue();
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncNow() {
    setBusy(true);
    try {
      await sync.syncNow();
      await refreshQueue();
    } finally {
      setBusy(false);
    }
  }

  const statusView = describeSyncStatus(status);

  return (
    <div className="space-y-3">
      <FlowSteps
        steps={["Operasi lokal", "Antrean sinkron", "Google Sheets", "Berhasil"]}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleEnqueueTest} disabled={busy}>
          Uji antrean
        </Button>
        <Button variant="secondary" onClick={handleSyncNow} disabled={busy}>
          Coba sinkron sekarang
        </Button>
      </div>
      <p className="text-xs text-stone-500" role="status">
        Status:{" "}
        <span className="font-semibold text-stone-700">{statusView.label}</span>
        {" — "}
        {statusView.description}
      </p>
      {queue.length > 0 ? (
        <div className="rounded-xl bg-stone-50 p-3">
          <p className="text-xs font-semibold text-stone-700">
            Menunggu di antrean ({queue.length}):
          </p>
          <ul className="mt-1.5 space-y-1">
            {queue.slice(0, 3).map((item) => (
              <li key={item.id} className="text-[11px] text-stone-500">
                {item.operation.entity} · {item.operation.kind} · percobaan:{" "}
                {item.attempts}
                {item.lastError ? ` · ${item.lastError}` : ""}
              </li>
            ))}
          </ul>
          {queue.length > 3 ? (
            <p className="mt-1 text-[11px] text-stone-400">+{queue.length - 3} lainnya</p>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs leading-relaxed text-stone-500">
        Google Sheets terhubung pada Tahap 2. Sampai itu terjadi, operasi uji
        memang sengaja tetap tinggal di antrean — sesuai arsitektur: kegagalan
        koneksi tidak pernah menghilangkan data, dan pengiriman diulang
        otomatis saat koneksi kembali.
      </p>
    </div>
  );
}
