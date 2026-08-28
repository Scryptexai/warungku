"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import {
  describeSyncStatus,
  SYNC_TONE_CLASSES,
} from "@/components/ui/sync-status";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { SyncStatusSnapshot } from "@/domain";

/**
 * Pil status sinkronisasi di bilah atas — selalu terlihat agar pemilik
 * warung tahu kondisi datanya (aman / mengantre / tersinkron).
 */
export function SyncStatusPill() {
  const { sync } = useApp();
  const [status, setStatus] = useState<SyncStatusSnapshot>(() => sync.getStatus());

  useEffect(() => {
    setStatus(sync.getStatus());
    return sync.subscribe(setStatus);
  }, [sync]);

  const view = describeSyncStatus(status);

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        SYNC_TONE_CLASSES[view.tone],
      )}
    >
      <Icon name={view.iconName} className="h-3.5 w-3.5" />
      {view.label}
    </span>
  );
}
