"use client";

import { useEffect, useRef, useState } from "react";
import type { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";

export type ScannerStatus = "starting" | "scanning" | "denied" | "error" | "stopped";

interface ScannerControls {
  stop: () => void;
}

/**
 * Tampilan kamera pemindai barcode (ZXing) — hanya berjalan di klien.
 * Format yang dibaca: barcode ritel umum (EAN-13/8, UPC-A/E, Code128/39, ITF).
 * Status izin/kegagalan kamera ditampilkan dengan bahasa sederhana.
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

    async function startCamera(): Promise<void> {
      const video = videoRef.current;
      if (!video) return;
      try {
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
          { audio: false, video: { facingMode: "environment" } },
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
        const name = (error as { name?: string } | null)?.name;
        console.warn("[warungku] Kamera tidak bisa dibuka.", error);
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [onCode, retryCount]);

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

      {status === "denied" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-950/85 px-6 text-center">
          <Icon name="alert" className="h-8 w-8 text-amber-400" />
          <p className="text-sm font-bold text-white">Izin kamera ditolak</p>
          <p className="max-w-[32ch] text-xs leading-relaxed text-white/70">
            Aktifkan izin kamera untuk memindai barcode, atau masukkan kode
            barcode secara manual di bawah.
          </p>
          <Button
            variant="secondary"
            className="mt-1"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Coba Lagi
          </Button>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-950/85 px-6 text-center">
          <Icon name="alert" className="h-8 w-8 text-red-400" />
          <p className="text-sm font-bold text-white">Kamera tidak bisa dibuka</p>
          <p className="max-w-[32ch] text-xs leading-relaxed text-white/70">
            Pastikan kamera tidak sedang dipakai aplikasi lain, lalu coba lagi —
            atau masukkan kode barcode secara manual di bawah.
          </p>
          <Button
            variant="secondary"
            className="mt-1"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Coba Lagi
          </Button>
        </div>
      ) : null}
    </div>
  );
}
