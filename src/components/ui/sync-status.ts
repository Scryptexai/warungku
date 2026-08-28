import type { SyncState, SyncStatusSnapshot } from "@/domain";
import type { IconName } from "./icons";

/**
 * Pemetaan status sinkronisasi → tampilan berbahasa Indonesia.
 * Dipakai bersama oleh pil status di TopBar dan kartu uji sinkronisasi.
 */

export type SyncTone = "ok" | "busy" | "wait" | "error";

export interface SyncStatusView {
  label: string;
  description: string;
  iconName: IconName;
  tone: SyncTone;
}

export const SYNC_TONE_CLASSES: Record<SyncTone, string> = {
  ok: "border-brand-200 bg-brand-50 text-brand-700",
  busy: "border-sky-200 bg-sky-50 text-sky-700",
  wait: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

export function describeSyncState(state: SyncState, queuedCount: number): SyncStatusView {
  switch (state) {
    case "SYNCING":
      return {
        label: "Menyinkron…",
        description: "Sedang mengirim data ke Google Sheets.",
        iconName: "sync",
        tone: "busy",
      };
    case "SYNCED":
      return {
        label: "Tersinkron",
        description: "Semua data sudah tersimpan di Google Sheets.",
        iconName: "check",
        tone: "ok",
      };
    case "WAITING":
      return {
        label: queuedCount > 0 ? `Antre ${queuedCount}` : "Menunggu",
        description: "Ada data menunggu koneksi Google Sheets.",
        iconName: "cloudOff",
        tone: "wait",
      };
    case "ERROR":
      return {
        label: "Akan dicoba lagi",
        description: "Pengiriman terakhir gagal; data tetap aman di antrean.",
        iconName: "alert",
        tone: "error",
      };
    case "IDLE":
    default:
      return {
        label: "Siap",
        description: "Tidak ada data yang menunggu sinkronisasi.",
        iconName: "cloud",
        tone: "ok",
      };
  }
}

export function describeSyncStatus(status: SyncStatusSnapshot): SyncStatusView {
  return describeSyncState(status.state, status.queuedCount);
}
