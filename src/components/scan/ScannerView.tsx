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
  | "insecure"
  | "error"
  | "stopped";

interface ScannerControls {
  stop: () => void;
}

interface CameraIssue {
  title: string;
  description: string;
  /** Tunjukkan tombol "Buka di Tab Baru" (untuk kasus pratinjau/izin). */
  showNewTab: boolean;
}

const CAMERA_ISSUES: Record<string, CameraIssue> = {
  insecure: {
    title: "Koneksi tidak aman (HTTP)",
    description:
      "Browser hanya mengizinkan kamera lewat HTTPS atau localhost. Buka aplikasi dengan alamat yang diawali https://",
    showNewTab: false,
  },
  denied: {
    title: "Izin kamera ditolak",
    description:
      "Browser sedang memblokir kamera untuk aplikasi ini, dan dialog izin tidak akan muncul lagi sendirinya. Ketuk ikon 🔒 / ⚙️ di bilah alamat → izinkan Kamera — kamera akan menyala otomatis setelah diizinkan.",
    showNewTab: true,
  },
  blocked: {
    title: "Kamera diblokir mode pratinjau",
    description:
      "Aplikasi terbuka di dalam bingkai pratinjau yang memblokir kamera. Ketuk ikon 🔒 di bilah alamat → izinkan Kamera; jika tidak ada opsinya, buka di tab baru supaya dialog izin bisa muncul.",
    showNewTab: true,
  },
  "in-use": {
    title: "Kamera sedang dipakai aplikasi lain",
    description:
      "Tutup aplikasi lain yang memakai kamera (mis. WhatsApp, Zoom, aplikasi kamera), lalu tekan Coba Lagi.",
    showNewTab: false,
  },
  "no-camera": {
    title: "Kamera tidak ditemukan",
    description:
      "Perangkat ini tidak memiliki kamera yang bisa dipakai browser. Masukkan kode barcode secara manual di bawah.",
    showNewTab: false,
  },
  error: {
    title: "Kamera tidak bisa dibuka",
    description:
      "Coba muat ulang halaman ini. Kalau tetap gagal, masukkan kode barcode secara manual di bawah.",
    showNewTab: true,
  },
};

/** Ubah error kamera menjadi status yang bisa ditampilkan jelas. */
function classifyCameraError(error: unknown, inIframe: boolean): ScannerStatus {
  const name = (error as { name?: string } | null)?.name ?? "";
  if (["NotAllowedError", "SecurityError", "PermissionDeniedError"].includes(name)) {
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

interface CameraChoice {
  deviceId: string;
  /** Label dibaca dari MediaDeviceInfo.label. Mungkin kosong sebelum izin. */
  label: string;
}

/** Deteksi kamera tersedia. Daftar kosong = tidak ada / izin belum granted. */
async function listCameras(): Promise<CameraChoice[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "videoinput")
    .map((device, index) => ({
      deviceId: device.deviceId,
      // Label kosong artinya browser menunggu izin dulu. Beri nama sintetis.
      label: device.label || `Kamera ${index + 1}`,
    }));
}

/** Pendinginan minimum antar hasil decode (ms). Cegah noise / double-trigger. */
const SCAN_COOLDOWN_MS = 1500;

/**
 * Validasi hasil decode ZXing. Menolak:
 *   - string kosong atau lebih pendek dari 4 karakter (EAN/UPC/Code128 minimal).
 *   - string lebih panjang dari 32 karakter (kode industri tidak lebih dari ini).
 *   - karakter di luar charset barcode umum (A-Z 0-9 - . $ / + % spasi).
 *   - pola berulang monoton (mis. "11111111", "12345678") yang khas artifact.
 * Kedua panggilan terakhir harus berjarak ≥ SCAN_COOLDOWN_MS.
 */
function isPlausibleBarcode(raw: string, elapsedMs: number): boolean {
  if (!raw) return false;
  if (raw.length < 4 || raw.length > 32) return false;
  if (elapsedMs > 0 && elapsedMs < SCAN_COOLDOWN_MS) return false;
  if (!/^[A-Z0-9\-.$\/+% ]+$/i.test(raw)) return false;
  // Tolak pola monoton berulang (semua digit sama).
  if (/^(.)\1+$/.test(raw)) return false;
  return true;
}

/**
 * Tampilan kamera pemindai barcode (ZXing) — hanya berjalan di klien.
 *
 * Perilaku izin kamera:
 * - Status izin dicek lewat navigator.permissions SEBELUM meminta kamera.
 *   Bila 'prompt' (belum pernah ditanya), getUserMedia memunculkan POPUP izin.
 * - Bila sudah 'denied', browser TIDAK akan menampilkan popup lagi — pengguna
 *   diarahkan mengubah lewat ikon 🔒, dan saat diubah menjadi izinkan,
 *   pemindai MENYALA OTOMATIS (permissions.onchange).
 * - Kegagalan lain didiagnosis spesifik: diblokir bingkai pratinjau,
 *   dipakai aplikasi lain, kamera tidak ada, konteks tidak aman, galat umum.
 */
export function ScannerView({
  onCode,
  /** Bypass filter + cooldown (dipakai oleh input manual yang sudah divalidasi). */
  bypassGuard = false,
}: {
  /** Dipanggil sekali per sesi scan dengan isi barcode yang terbaca. */
  onCode: (code: string) => void;
  /** True untuk panggilan sintetis (mis. input manual) yang sudah divalidasi user. */
  bypassGuard?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const handledRef = useRef(false);
  /** Timestamp decode terakhir yang lolos — cooldown supaya ZXing tidak
   *  memanggil onCode berulang dari frame yang sama. */
  const lastHandledAtRef = useRef(0);
  const [status, setStatus] = useState<ScannerStatus>("starting");
  const [retryCount, setRetryCount] = useState(0);
  const [cameras, setCameras] = useState<CameraChoice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  // framesScanned membantu user yakin pemindai hidup — naik tiap callback
  // dipanggil (jadi angka > 0 dalam ~1-2 dtk artinya stream & decoder bekerja).
  const framesScannedRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    handledRef.current = false;
    setStatus("starting");

    const inIframe =
      typeof window !== "undefined" && window.self !== window.top;

    /** Mulai ulang pemindai (dipakai juga saat izin berubah jadi izinkan). */
    const restart = (): void => setRetryCount((count) => count + 1);

    /** Minta izin kamera lebih dulu agar label kamera tersedia saat listing. */
    async function primeCameraList(): Promise<void> {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        return;
      }
      // Probe stream pendek — ini yang memicu popup izin. Setelah granted,
      // enumerateDevices mengembalikan label asli, bukan nama sintetis.
      try {
        const probe = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        probe.getTracks().forEach((track) => track.stop());
      } catch {
        // Izin ditolak / tidak ada kamera — listCameras() akan return [].
      }
      const list = await listCameras();
      if (cancelled) return;
      setCameras(list);
    }

    /** Pantau perubahan izin — begitu diizinkan, kamera menyala otomatis. */
    function watchPermission(): void {
      if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
      navigator.permissions
        .query({ name: "camera" as PermissionName })
        .then((permission) => {
          permission.onchange = () => {
            if (cancelled) return;
            if (permission.state === "granted") restart();
          };
        })
        .catch(() => undefined);
    }

    async function requestCamera(): Promise<void> {
      // 1) Konteks harus aman & API kamera harus ada.
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setStatus("insecure");
        return;
      }

      // 2) Cek status izin terlebih dahulu.
      try {
        const permission = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        if (permission.state === "denied") {
          // Browser tidak akan menampilkan popup — arahkan ke ikon 🔒.
          setStatus(inIframe ? "blocked" : "denied");
          watchPermission();
          return;
        }
        // state 'prompt' → getUserMedia di bawah akan memunculkan POPUP izin.
        // state 'granted' → langsung jalan tanpa bertanya.
      } catch {
        // Browser tanpa dukungan permissions.query (mis. Firefox/Safari lama)
        // — lanjut langsung; popup akan muncul dari getUserMedia.
      }

      // 3) Nyalakan kamera sekali saja (satu getUserMedia, tanpa pre-flight
      //    ganda yang bisa membuat kamera bentrok dengan dirinya sendiri).
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
        const hints = new Map<DecodeHintType, unknown>();
        hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, formats);
        // TRY_HARDER: baca barcode lebih teliti (buram, miring, kurang cahaya).
        hints.set(zxing.DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 150,
        });

        // Minta resolusi tinggi + kamera belakang. Barcode ritel (EAN-13)
        // bergaris tipis; stream bawaan 640x480 sering terlalu kasar untuk
        // dibaca — 1280x720 jauh lebih andal untuk deteksi.
        const constraints: MediaStreamConstraints = activeDeviceId
          ? {
              audio: false,
              video: {
                deviceId: { exact: activeDeviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            }
          : {
              audio: false,
              video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            };

        const controls = await reader.decodeFromConstraints(
          constraints,
          video,
          (result, error) => {
            // ZXing selalu memanggil callback dengan error pada setiap frame
            // yang tidak berisi barcode (NotFoundException normal). Hanya
            // hitung "scan attempt" ketika ada result ATAU error lain.
            if (result) {
              framesScannedRef.current += 1;
            } else if (
              error &&
              (error as { name?: string }).name !== "NotFoundException"
            ) {
              console.warn("[warungku] Scanner error non-NotFound:", error);
            }
            if (cancelled || handledRef.current) return;
            const raw = result?.getText?.()?.trim() ?? "";
            if (!raw) return;
            // Guard: tolak hasil ZXing yang terlihat seperti noise (angka
            // acak dari frame blur/gambar tak jelas). Panjang minimal 4,
            // maksimal 32 (EAN/UPC/Code128 umumnya 4-14), charset alfabet-
            // numerik umum barcode. Bypass untuk input manual.
            if (
              !bypassGuard &&
              !isPlausibleBarcode(raw, Date.now() - lastHandledAtRef.current)
            ) {
              console.warn(
                "[warungku] Scanner: hasil diabaikan (tidak plausible):",
                raw,
              );
              return;
            }
            lastHandledAtRef.current = Date.now();
            handledRef.current = true;
            controlsRef.current?.stop();
            controlsRef.current = null;
            setStatus("stopped");
            onCode(raw);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStatus("scanning");
        // Setelah izin granted, daftar kamera sekarang punya label asli.
        // Sinkronkan ulang supaya dropdown "Ganti Kamera" akurat.
        const list = await listCameras();
        if (!cancelled) setCameras(list);

        // Aktifkan fokus otomatis berkelanjutan bila perangkat mendukung,
        // supaya barcode cepat tajam. Diabaikan diam-diam bila tak didukung.
        try {
          const stream = video.srcObject as MediaStream | null;
          const track = stream?.getVideoTracks?.()[0];
          const caps = track?.getCapabilities?.() as
            | { focusMode?: string[] }
            | undefined;
          if (track && caps?.focusMode?.includes("continuous")) {
            await track.applyConstraints({
              advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
            });
          }
        } catch {
          // Perangkat tanpa kontrol fokus — lewati.
        }
      } catch (error) {
        if (cancelled) return;
        console.warn("[warungku] Kamera tidak bisa dibuka:", error);
        const next = classifyCameraError(error, inIframe);
        setStatus(next);
        if (next === "denied" || next === "blocked") watchPermission();
      }
    }

    void (async () => {
      await primeCameraList();
      if (cancelled) return;
      await requestCamera();
    })();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [onCode, retryCount, activeDeviceId, bypassGuard]);

  function handleSwitchCamera(deviceId: string) {
    setActiveDeviceId((current) => (current === deviceId ? null : deviceId));
    setRetryCount((count) => count + 1);
  }

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

      {status === "scanning" ? (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
          <span className="rounded-full bg-emerald-500/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            ● Memindai
          </span>
          {cameras.length > 1 ? (
            <div className="pointer-events-auto flex max-w-[60%] flex-wrap justify-end gap-1.5">
              {cameras.map((camera) => {
                const isActive = (activeDeviceId ?? cameras[0]?.deviceId) === camera.deviceId;
                return (
                  <button
                    key={camera.deviceId}
                    type="button"
                    onClick={() => handleSwitchCamera(camera.deviceId)}
                    className={
                      "max-w-[14rem] truncate rounded-full px-2.5 py-1 text-[10px] font-bold " +
                      (isActive
                        ? "bg-white text-stone-900"
                        : "bg-white/15 text-white/90 active:bg-white/30")
                    }
                    title={camera.label}
                  >
                    {camera.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {issue ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-stone-950/88 px-6 text-center">
          <Icon name="alert" className="h-8 w-8 text-amber-400" />
          <p className="text-sm font-bold text-white">{issue.title}</p>
          <p className="max-w-[36ch] text-xs leading-relaxed text-white/70">
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
          {status === "denied" || status === "blocked" ? (
            <p className="text-[11px] text-white/45">
              Setelah diizinkan lewat ikon 🔒, kamera menyala otomatis — tanpa
              perlu menekan apa pun.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
