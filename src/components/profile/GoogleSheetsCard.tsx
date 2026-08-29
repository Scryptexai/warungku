"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/AppProviders";
import { Icon } from "@/components/ui/icons";
import {
  markSheetsConnected,
  markSheetsDisconnected,
  readShopProfile,
} from "@/services/store-profile.service";
import type { Store } from "@/domain";

interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
}

const FAILURE_MESSAGES: Record<string, string> = {
  konfigurasi:
    "Server belum dikonfigurasi untuk Google. Isi GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan GOOGLE_TOKEN_ENCRYPTION_KEY di .env.local (lihat README).",
  state: "Sesi login kedaluwarsa. Coba sambungkan lagi.",
  token: "Google menolak login. Coba lagi beberapa saat.",
  access_denied: "Izin Google dibatalkan. Coba sambungkan lagi.",
};

/**
 * Kartu koneksi Google Sheets di halaman Profil.
 * Alur: Sambungkan Google → login Google → kembali ke Profil → spreadsheet
 * warung disiapkan otomatis → antrean lokal langsung dikirim.
 */
export function GoogleSheetsCard() {
  const { localStore, sync } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [profile, setProfile] = useState<Store | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    try {
      const [statusResponse, shopProfile] = await Promise.all([
        fetch("/api/auth/google/status", { cache: "no-store" }),
        readShopProfile(localStore),
      ]);
      const body = (await statusResponse.json()) as {
        ok: boolean;
        data?: GoogleStatus;
      };
      setStatus(
        body.ok && body.data ? body.data : { configured: false, connected: false, email: null },
      );
      setProfile(shopProfile);
    } catch {
      setStatus({ configured: false, connected: false, email: null });
    }
  }, [localStore]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  // Setelah callback OAuth sukses (?terhubung=1) → siapkan spreadsheet.
  const justConnected = searchParams.get("terhubung") === "1";
  const failureKey = searchParams.get("gagal");
  useEffect(() => {
    if (!justConnected) return;
    let active = true;
    setBusy(true);
    (async () => {
      try {
        const shop = await readShopProfile(localStore);
        const response = await fetch("/api/sheets/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopName: shop.name }),
        });
        const body = (await response.json()) as {
          ok: boolean;
          data?: { spreadsheetId: string; url: string; created: boolean };
          error?: { message: string };
        };
        if (!active) return;
        if (body.ok && body.data) {
          await markSheetsConnected(
            localStore,
            body.data.spreadsheetId,
            body.data.url,
          );
          await sync.syncNow(); // kirim antrean lokal ke spreadsheet
          setMessage(
            body.data.created
              ? "Spreadsheet warung berhasil dibuat di Google Sheets Anda."
              : "Spreadsheet warung ditemukan kembali dan siap dipakai.",
          );
        } else {
          setMessage(body.error?.message ?? "Gagal menyiapkan spreadsheet. Coba lagi.");
        }
      } catch {
        if (active) setMessage("Gagal menyiapkan spreadsheet. Periksa koneksi lalu coba lagi.");
      } finally {
        if (active) setBusy(false);
        if (active) void refreshState();
        router.replace("/profil");
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justConnected]);

  useEffect(() => {
    if (failureKey) {
      setMessage(FAILURE_MESSAGES[failureKey] ?? "Koneksi Google gagal. Coba lagi.");
      router.replace("/profil");
    }
  }, [failureKey, router]);

  async function handleConnect() {
    window.location.href = "/api/auth/google/start";
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await fetch("/api/auth/google/disconnect", { method: "POST" });
      await markSheetsDisconnected(localStore);
      await refreshState();
      setMessage("Koneksi Google diputus. Data transaksi tetap aman di perangkat.");
    } finally {
      setBusy(false);
    }
  }

  const connected = status?.connected && profile?.spreadsheetId;

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5">
      <div className="flex items-start gap-3">
        <span
          className={
            connected
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
          }
        >
          <Icon name={connected ? "cloud" : "cloudOff"} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-stone-900">Data &amp; Google Sheets</h2>

          {connected ? (
            <>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                  Terhubung
                </span>
                {status?.email ? (
                  <span className="truncate text-[11px] text-stone-400">{status.email}</span>
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                Semua data warung — produk, transaksi, bon — tersimpan di Google
                Sheets milik Anda sendiri.
              </p>
              {profile?.spreadsheetUrl ? (
                <a
                  href={profile.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 active:opacity-80"
                >
                  <Icon name="receipt" className="h-4 w-4" />
                  Buka Spreadsheet Warung
                </a>
              ) : null}
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={busy}
                className="mt-2 block text-xs font-semibold text-red-600 underline disabled:opacity-50"
              >
                Putuskan koneksi Google
              </button>
            </>
          ) : (
            <>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  Belum terhubung
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                Sambungkan akun Google Anda — aplikasi membuat spreadsheet khusus
                untuk warung ini. Data warung tetap milik Anda, bukan disimpan di
                server orang lain.
              </p>
              <button
                type="button"
                onClick={handleConnect}
                disabled={busy || (status !== null && !status.configured)}
                className="mt-2.5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white active:opacity-80 disabled:opacity-50"
              >
                Sambungkan Google
              </button>
              {status && !status.configured ? (
                <p className="mt-2 rounded-xl bg-stone-50 p-2.5 text-[11px] leading-relaxed text-stone-500">
                  Server belum dikonfigurasi: isi <code>GOOGLE_CLIENT_ID</code>,{" "}
                  <code>GOOGLE_CLIENT_SECRET</code>, dan{" "}
                  <code>GOOGLE_TOKEN_ENCRYPTION_KEY</code> di{" "}
                  <code>.env.local</code> — panduan ada di README.
                </p>
              ) : null}
            </>
          )}

          {message ? (
            <p
              role="status"
              className="mt-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] leading-relaxed text-stone-600"
            >
              {message}
            </p>
          ) : null}
          {busy ? (
            <p className="mt-2 text-[11px] text-stone-400">Memproses…</p>
          ) : null}
          <p className="mt-2 text-[10px] text-stone-400">
            Transaksi selalu disimpan dulu di perangkat, lalu dikirim ke Google
            Sheets — jualan tetap jalan walau jaringan putus.
          </p>
        </div>
      </div>
    </section>
  );
}
