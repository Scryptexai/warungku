"use client";

import { useEffect, useRef, useState } from "react";
import type { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";

export type ScannerStatus =
  | "starting"
  | "scanning"
  | "denied"
  | "blocked"
  | "in-use"
  | "no-camera"
  | "error"
  | "stopped";

interface ScannerControls {
  stop: () => void;
}

interface CameraIssue {
  title: string;
  description: string;
  showNewTab: boolean;
}

const CAMERA_ISSUES: Record<string, CameraIssue> = {
  denied: {
    title: "Izin kamera ditolak",
    description:
      "Ketuk ikon gembok 🔒 di bilah alamat browser, izinkan Kamera, lalu tekan Coba Lagi.",
    showNewTab: true,
  },
  blocked: {
    title: "Kamera diblokir mode pratinjau",
    description:
      "Aplikasi sedang terbuka di dalam bingkai pratinjau yang memblokir kamera. Buka di tab baru supaya kamera bisa menyala.",
    showNewTab: true,
  },
  "in-use": {
    title: "Kamera sedang dipakai aplikasi lain",
    description:
      "Tutup aplikasi lain yang memakai kamera (mis. WhatsApp / kamera), lalu tekan Coba Lagi.",
    showNewTab: false,
  },
  "no-camera": {
    title: "Kamera tidak ditemukan",
    description:
      "Perangkat ini tidak memiliki kamera yang bisa dipakai. Masukkan kode barcode secara manual di bawah.",
    showNewTab: false,
  },
  error: {
    title: "Kamera tidak bisa dibuka",
    description:
      "Coba tutup lalu buka ulang halaman ini. Kalau tetap gagal, masukkan kode barcode secara manual di bawah.",
    showNewTab: true,
  },
};

/** Ubah error kamera menjadi status yang bisa ditampilkan jelas. */
function classifyCameraError(error: unknown): ScannerStatus {
  const name = (error as { name?: string } | null)?.name ?? "";
  if (["NotAllowedError", "SecurityError", "PermissionDeniedError"].includes(name)) {
    // Di dalam iframe pratinjau, penolakan hampir selalu karena bingkai
    // tidak diizinkan memakai kamera — bukan salah pengguna.
    const inIframe =
      typeof window !== "undefined" && window.self !== window.top;
    return inIframe ? "blocked" : "denied";
  }
  if (["NotReadableError", "TrackStartError", "AbortError"].includes(name)) {
    return "in-use";
  }
  if (["NotFoundError", "DevicesNotFoundError", "OverconstrainedError"].includes(name)) {
    return "no-camera";
  }
  return "error";
}

/**
 * Tampilan kamera pemindai barcode (ZXing) — hanya berjalan di klien.
 * Status izin/kegagalan kamera didiagnosis spesifik agar pesannya jelas:
 * izin ditolak, diblokir bingkai pratinjau, dipakai aplikasi lain,
 * kamera tidak ada, atau galat umum — masing-masing dengan solusinya.
 * Format yang dibaca: barcode ritel umum (EAN-13/8, UPC-A/E, Code128/39, ITF).
 */
export function ScannerView({
  onCode,
}: {
  /** Dipanggil sekali per sesi scan dengan isi barcode yang terbaca. */
  onCode: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const handledRef = useRef(false);
  const [status, setStatus] = useState<ScannerStatus>("starting");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    handledRef.current = false;
    setStatus("starting");

    /** Pre-flight: picu dialog izin & dapatkan nama error yang akurat. */
    async function probeCamera(): Promise<void> {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        // Konteks tidak aman / diblokir sepenuhnya.
        throw new DOMException("mediaDevices tidak tersedia", "SecurityError");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      stream.getTracks().forEach((track) => track.stop());
    }

    async function startCamera(): Promise<void> {
      const video = videoRef.current;
      if (!video) return;
      try {
        await probeCamera();
        if (cancelled) return;

        const [{ BrowserMultiFormatReader }, zxing] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (cancelled) return;

        const formats: BarcodeFormat[] = [
          zxing.BarcodeFormat.EAN_13,
          zxing.BarcodeFormat.EAN_8,
          zxing.BarcodeFormat.UPC_A,
          zxing.BarcodeFormat.UPC_E,
          zxing.BarcodeFormat.CODE_128,
          zxing.BarcodeFormat.CODE_39,
          zxing.BarcodeFormat.ITF,
        ];
        const hints = new Map<DecodeHintType, BarcodeFormat[]>();
        hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, formats);
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 150,
        });

        const controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          video,
          (result) => {
            if (cancelled || handledRef.current) return;
            const text = result?.getText?.()?.trim();
            if (!text) return;
            handledRef.current = true;
            controlsRef.current?.stop();
            controlsRef.current = null;
            setStatus("stopped");
            onCode(text);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStatus("scanning");
      } catch (error) {
        if (cancelled) return;
        console.warn("[warungku] Kamera tidak bisa dibuka:", error);
        setStatus(classifyCameraError(error));
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [onCode, retryCount]);

  const issue =
    status === "starting" || status === "scanning" || status === "stopped"
      ? null
      : CAMERA_ISSUES[status] ?? CAMERA_ISSUES.error;

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl bg-stone-900">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {status === "starting" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-950/70 text-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="text-xs font-medium text-white/80">Menyiapkan kamera…</p>
        </div>
      ) : null}

      {issue ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-stone-950/88 px-6 text-center">
          <Icon name="alert" className="h-8 w-8 text-amber-400" />
          <p className="text-sm font-bold text-white">{issue.title}</p>
          <p className="max-w-[34ch] text-xs leading-relaxed text-white/70">
            {issue.description}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Coba Lagi
            </Button>
            {issue.showNewTab ? (
              <a
                href="/scan"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white active:opacity-80"
              >
                Buka di Tab Baru
              </a>
            ) : null}
          </div>
          {issue.showNewTab ? (
            <p className="text-[11px] text-white/45">
              Tab baru membuka aplikasi penuh — kamera bisa menyala normal.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
