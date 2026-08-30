"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { Icon } from "@/components/ui/icons";
import type { Transaction } from "@/domain";
import { formatIDR } from "@/lib/money";

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Satu baris aktivitas transaksi terakhir. */
function ActivityRow({ transaction }: { transaction: Transaction }) {
  const isBon = transaction.paymentType === "BON";
  return (
    <Link
      href="/transaksi"
      className="flex items-center gap-3 rounded-xl p-2 -mx-2 active:bg-stone-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon name={isBon ? "receipt" : "cart"} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-stone-800">
          {isBon && transaction.customer
            ? `Bon — ${transaction.customer.name}`
            : "Penjualan Tunai"}
        </span>
        <span className="block text-[11px] text-stone-400">
          {formatTime(transaction.timestamp)}
        </span>
      </span>
      <span className="shrink-0 text-sm font-bold text-stone-900">
        {formatIDR(transaction.total)}
      </span>
    </Link>
  );
}

/**
 * Aktivitas terakhir di Beranda — dari database transaksi perangkat.
 * Instan & offline-first.
 */
export function RecentActivity() {
  const { transactions, ensureLocal } = useCatalog();

  useEffect(() => {
    void ensureLocal();
  }, [ensureLocal]);

  const latest = useMemo(
    () => (transactions ?? []).slice(0, 3),
    [transactions],
  );

  return (
    <section
      aria-label="Aktivitas terakhir"
      className="rounded-2xl bg-white p-4 ring-1 ring-stone-900/5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-stone-900">Aktivitas Terakhir</h2>
        <Link href="/transaksi" className="text-xs font-semibold text-brand-700">
          Lihat Semua
        </Link>
      </div>
      {latest.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-stone-200 px-3 py-6 text-center">
          <Icon name="receipt" className="h-7 w-7 text-stone-300" />
          <p className="text-sm font-semibold text-stone-700">Belum ada transaksi</p>
          <p className="max-w-[32ch] text-xs leading-relaxed text-stone-500">
            Transaksi tercatat otomatis setiap kali Anda jualan dengan scan
            barcode — dan tersimpan di perangkat ini.
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-1">
          {latest.map((transaction) => (
            <ActivityRow key={transaction.id} transaction={transaction} />
          ))}
        </div>
      )}
    </section>
  );
}
