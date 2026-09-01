"use client";

import { Icon } from "@/components/ui/icons";
import type { SyncState } from "@/domain";
import { formatIDR } from "@/lib/money";

/**
 * Panel hasil transaksi (§5B): SUKSES ditentukan oleh COMMIT LOKAL.
 * Status Google Sheets ditampilkan terpisah & tidak pernah menunda:
 *   ✓ Tersinkron  /  ⟳ Mengirim…  /  ⚠ menunggu internet (auto-retry).
 */
export function SaleResultSheet({
  total,
  paymentType,
  customerName,
  sync,
  onRetrySync,
  onDone,
  retrying,
}: {
  total: number;
  paymentType: string;
  customerName: string | null;
  sync: { state: SyncState; queuedCount: number };
  onRetrySync: () => void;
  onDone: () => void;
  retrying: boolean;
}) {
  const synced = sync.queuedCount === 0 && (sync.state === "SYNCED" || sync.state === "IDLE");
  const sending = sync.state === "SYNCING";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60">
      <div className="animate-sheet-up w-full max-w-lg rounded-t-3xl bg-white p-5 pb-7 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Icon name="check" className="h-8 w-8" />
        </span>
        <h2 className="mt-3 text-base font-bold text-stone-900">
          ✓ Transaksi tersimpan
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          {paymentType === "BON" ? `Bon ${customerName}` : "Tunai"} ·{" "}
          {formatIDR(total)} — tersimpan di perangkat ini.
        </p>

        {/* Status sinkron — informatif, bukan syarat keberhasilan */}
        {synced ? (
          <p className="mt-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs font-semibold text-brand-800">
            ✓ Tersinkron ke Google Sheets
          </p>
        ) : sending ? (
          <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-semibold text-stone-700">
            ⟳ Mengirim ke Google Sheets di latar belakang — lanjut jualan saja.
          </p>
        ) : (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-800">
              ⚠ {sync.queuedCount > 0 ? `${sync.queuedCount} data ` : ""}menunggu
              sinkron — otomatis terkirim saat internet kembali.
            </p>
            <button
              type="button"
              disabled={retrying}
              onClick={onRetrySync}
              className="mt-2 inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-500 px-4 text-xs font-bold text-white active:opacity-80 disabled:opacity-50"
            >
              {retrying ? "Mengirim…" : "Kirim Sekarang"}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onDone}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80"
        >
          Transaksi Baru
        </button>
      </div>
    </div>
  );
}
