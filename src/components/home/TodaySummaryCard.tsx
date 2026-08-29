"use client";

import { useEffect, useState } from "react";
import { formatIDR } from "@/lib/money";

/**
 * Kartu ringkasan hari ini — menimpa tepi bawah header gradien
 * (pola kartu saldo pada aplikasi dompet digital).
 * Nilai akan terisi otomatis setelah pencatatan transaksi aktif (Tahap 3).
 */
export function TodaySummaryCard() {
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    setDateLabel(
      new Intl.DateTimeFormat("id-ID", {
        dateStyle: "full",
        timeZone: "Asia/Jakarta",
      }).format(new Date()),
    );
  }, []);

  return (
    <section
      aria-label="Ringkasan hari ini"
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-900/5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-stone-900">Hari Ini</h2>
        <span className="truncate text-[11px] text-stone-400">
          {dateLabel || "Hari ini"}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-3 divide-x divide-stone-100">
        <div className="pr-2">
          <dt className="text-[11px] text-stone-500">Omzet</dt>
          <dd className="mt-0.5 text-base font-bold text-stone-900">{formatIDR(0)}</dd>
        </div>
        <div className="px-2">
          <dt className="text-[11px] text-stone-500">Transaksi</dt>
          <dd className="mt-0.5 text-base font-bold text-stone-900">0</dd>
        </div>
        <div className="pl-2">
          <dt className="text-[11px] text-stone-500">Bon</dt>
          <dd className="mt-0.5 text-base font-bold text-stone-900">{formatIDR(0)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
        Ringkasan otomatis dari transaksi warung Anda hadir di Tahap 4.
      </p>
    </section>
  );
}
