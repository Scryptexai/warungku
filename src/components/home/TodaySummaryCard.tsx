"use client";

import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { formatIDR, formatNumberID } from "@/lib/money";
import { summarizeTransactions } from "@/lib/reports";

/**
 * Kartu ringkasan hari ini — pola kartu saldo aplikasi dompet digital.
 * Dihitung LANGSUNG dari database transaksi perangkat (offline-first):
 * tanpa internet pun angka tetap benar.
 */
export function TodaySummaryCard() {
  const { transactions, ensureLocal } = useCatalog();
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    void ensureLocal();
    setDateLabel(
      new Intl.DateTimeFormat("id-ID", {
        dateStyle: "full",
        timeZone: "Asia/Jakarta",
      }).format(new Date()),
    );
  }, [ensureLocal]);

  const summary = useMemo(
    () => summarizeTransactions(transactions ?? [], "today"),
    [transactions],
  );

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
          <dd className="mt-0.5 text-base font-bold text-stone-900">
            {formatIDR(summary.omzet)}
          </dd>
        </div>
        <div className="px-2">
          <dt className="text-[11px] text-stone-500">Transaksi</dt>
          <dd className="mt-0.5 text-base font-bold text-stone-900">
            {formatNumberID(summary.transactionCount)}
          </dd>
        </div>
        <div className="pl-2">
          <dt className="text-[11px] text-stone-500">Bon</dt>
          <dd className="mt-0.5 text-base font-bold text-stone-900">
            {formatIDR(summary.bonTotal)}
          </dd>
        </div>
      </dl>
      {transactions !== null && transactions.length === 0 ? (
        <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
          Mulai jualan dengan tombol SCAN — angka harian terisi otomatis,
          bahkan tanpa internet.
        </p>
      ) : null}
    </section>
  );
}
