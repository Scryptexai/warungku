import { NotConnectedError } from "@/lib/errors";
import type { SyncTarget } from "./sync-engine";

/**
 * Target sinkronisasi bawaan Tahap 1: Google Sheets "belum terhubung".
 * Konsekuensinya operasi TETAP aman di antrean lokal — persis perilaku
 * "NETWORK FAILURE → REMAIN IN QUEUE" yang menjadi kontrak arsitektur.
 */
export class NotConnectedSyncTarget implements SyncTarget {
  async isReady(): Promise<boolean> {
    return false;
  }

  async push(): Promise<void> {
    throw new NotConnectedError(
      "Google Sheets belum terhubung. Operasi tetap disimpan di antrean lokal dan dikirim saat koneksi siap (Tahap 2).",
    );
  }
}
