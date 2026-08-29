import type { SyncQueueItem, SyncStatusSnapshot } from "@/domain";
import { nowISO } from "@/lib/datetime";
import { createPrefixedId } from "@/lib/id";
import type { SyncEngine, SyncStatusListener } from "@/sync/sync-engine";

/**
 * Facade sinkronisasi untuk UI — komponen tidak menyentuh engine secara
 * langsung, sehingga detail engine bisa berubah tanpa menyentuh UI.
 */
export class SyncService {
  constructor(private readonly engine: SyncEngine) {}

  getStatus(): SyncStatusSnapshot {
    return this.engine.getStatus();
  }

  subscribe(listener: SyncStatusListener): () => void {
    return this.engine.subscribe(listener);
  }

  getQueue(): Promise<SyncQueueItem[]> {
    return this.engine.getQueue();
  }

  syncNow(): ReturnType<SyncEngine["syncNow"]> {
    return this.engine.syncNow();
  }

  /**
   * Operasi PING tak-berbahaya untuk MENGUJI arsitektur antrean:
   * karena Google Sheets belum terhubung di Tahap 1, operasi ini tetap
   * tinggal di antrean dan terlihat di UI — bukti perilaku
   * "gagal → tetap di antrean → dicoba lagi saat koneksi kembali".
   */
  enqueuePing() {
    return this.engine.enqueue({
      id: createPrefixedId("op"),
      kind: "PING",
      entity: "META",
      payload: { message: "Uji antrean sinkronisasi Warungku", at: nowISO() },
      createdAt: nowISO(),
    });
  }
}
