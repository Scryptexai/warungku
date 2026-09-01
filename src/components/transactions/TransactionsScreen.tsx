"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/AppProviders";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";
import { LinkButton } from "@/components/ui/LinkButton";
import type { SyncQueueItem, Transaction } from "@/domain";
import { formatIDR } from "@/lib/money";
import { cn } from "@/lib/cn";

const TABS = ["Semua", "Tunai", "Bon"] as const;
type Tab = (typeof TABS)[number];

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Lencana status sinkron per transaksi (§5B):
 * SYNCED → Tersimpan · SYNCING → Sinkron… · FAILED → gagal kirim, menunggu
 * ulang · PENDING → menunggu sinkron. Semuanya non-blocking.
 */
function SyncBadge({
  syncedAt,
  queueItem,
}: {
  syncedAt: string | null;
  queueItem?: SyncQueueItem;
}) {
  if (syncedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600">
        <Icon name="check" className="h-3 w-3" />
        Tersinkron
      </span>
    );
  }
  if (queueItem?.status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600">
        <Icon name="sync" className="h-3 w-3 animate-spin" />
        Sinkron…
      </span>
    );
  }
  if ((queueItem?.attempts ?? 0) > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500">
        <Icon name="alert" className="h-3 w-3" />
        Gagal kirim — dicoba ulang
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
      <Icon name="sync" className="h-3 w-3" />
      Menunggu sinkron
    </span>
  );
}

function TransactionRow({
  transaction,
  queueItem,
  onOpen,
}: {
  transaction: Transaction;
  queueItem?: SyncQueueItem;
  onOpen: () => void;
}) {
  const isBon = transaction.paymentType === "BON";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-stone-900/5 active:bg-stone-50"
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          isBon ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-700",
        )}
      >
        <Icon name={isBon ? "receipt" : "cart"} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-stone-900">
          {isBon && transaction.customer
            ? `Bon — ${transaction.customer.name}`
            : "Penjualan Tunai"}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-stone-400">
          <span>{formatTime(transaction.timestamp)}</span>
          <span className="text-stone-300">·</span>
          <span>{transaction.items.length} item</span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-bold text-stone-900">
          {formatIDR(transaction.total)}
        </span>
        {isBon && transaction.paymentStatus === "UNPAID" ? (
          <span className="mb-0.5 inline-block rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
            Belum Lunas
          </span>
        ) : null}
        <SyncBadge syncedAt={transaction.syncedAt} queueItem={queueItem} />
      </span>
    </button>
  );
}

/** Struk detail transaksi — dibaca dari data perangkat, tanpa internet. */
function TransactionDetailSheet({
  transaction,
  queueItem,
  onClose,
}: {
  transaction: Transaction;
  queueItem?: SyncQueueItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60">
      <div className="animate-sheet-up max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Bon Transaksi</h2>
            <p className="mt-0.5 text-[11px] text-stone-500">
              {new Intl.DateTimeFormat("id-ID", {
                dateStyle: "full",
                timeStyle: "short",
              }).format(new Date(transaction.timestamp))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-3 space-y-1 text-xs text-stone-500">
          <div className="flex justify-between">
            <dt>Pembayaran</dt>
            <dd className="font-semibold text-stone-800">
              {transaction.paymentType === "BON" ? "Bon (bayar nanti)" : "Tunai"}
            </dd>
          </div>
          {transaction.customer ? (
            <div className="flex justify-between">
              <dt>Pembeli</dt>
              <dd className="font-semibold text-stone-800">
                {transaction.customer.name}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Status bon</dt>
            <dd
              className={
                transaction.paymentStatus === "UNPAID"
                  ? "font-semibold text-amber-600"
                  : "font-semibold text-stone-800"
              }
            >
              {transaction.paymentStatus === "UNPAID" ? "Belum lunas" : "Lunas"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Status penyimpanan</dt>
            <dd>
              <SyncBadge syncedAt={transaction.syncedAt} queueItem={queueItem} />
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-2xl bg-stone-50 p-4">
          <ul className="space-y-2.5">
            {transaction.items.map((item) => (
              <li key={`${item.productId}-${item.productName}`} className="text-sm">
                <div className="flex justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold text-stone-800">
                    {item.productName}
                  </span>
                  <span className="shrink-0 font-bold text-stone-900">
                    {formatIDR(item.subtotal)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  {item.quantity} × {formatIDR(item.unitPrice)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-stone-200 pt-3">
            <span className="text-sm font-bold text-stone-900">Total</span>
            <span className="text-base font-bold text-brand-700">
              {formatIDR(transaction.total)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white active:opacity-80"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}

/**
 * Layar Transaksi — riwayat lengkap dari DATABASE PERANGKAT (utama).
 * Instan & berfungsi tanpa internet; status sinkron ke Google Sheets
 * tampil per transaksi.
 */
export function TransactionsScreen() {
  const { transactions, ensureLocal } = useCatalog();
  const { sync } = useApp();
  const [tab, setTab] = useState<Tab>("Semua");
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<Transaction | null>(null);
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);

  useEffect(() => {
    void ensureLocal();
  }, [ensureLocal]);

  // Antrean sinkron per transaksi (badge PENDING/SYNCING/FAILED) —
  // diperbarui setiap kali status engine berubah.
  useEffect(() => {
    let active = true;
    const load = (): void => {
      void sync.getQueue().then((items) => {
        if (active) setQueue(items);
      });
    };
    load();
    const unsubscribe = sync.subscribe(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [sync]);

  const queueByTransaction = useMemo(() => {
    const map = new Map<string, SyncQueueItem>();
    for (const item of queue) {
      const payload = item.operation.payload as { id?: string } | null;
      if (item.operation.entity === "TRANSACTION" && payload?.id) {
        map.set(payload.id, item);
      }
    }
    return map;
  }, [queue]);

  const filtered = useMemo(() => {
    if (transactions === null) return null;
    let list = transactions;
    if (tab === "Tunai") list = list.filter((t) => t.paymentType !== "BON");
    if (tab === "Bon") list = list.filter((t) => t.paymentType === "BON");
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.customer?.name.toLowerCase().includes(q) ||
          t.items.some((item) => item.productName.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [transactions, tab, query]);

  const pendingCount = useMemo(
    () => transactions?.filter((t) => t.syncedAt === null).length ?? 0,
    [transactions],
  );

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Jenis transaksi"
        className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1"
      >
        {TABS.map((item) => {
          const active = tab === item;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item)}
              className={cn(
                "min-h-10 rounded-lg text-sm font-semibold transition-colors",
                active ? "bg-white text-stone-900 shadow-sm" : "text-stone-500",
              )}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={tab === "Bon" ? "Cari nama pembeli bon…" : "Cari produk atau pembeli…"}
          aria-label="Cari transaksi"
          className="min-h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-400"
        />
      </div>

      {pendingCount > 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
          {pendingCount} transaksi menunggu sinkron ke Google Sheets — aman
          tersimpan di perangkat ini dan terkirim otomatis saat online.
        </p>
      ) : null}

      <div className="space-y-2">
        {filtered === null ? (
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[71px] animate-pulse rounded-2xl bg-white ring-1 ring-stone-900/5"
              />
            ))}
          </>
        ) : filtered.length === 0 ? (
          transactions !== null && transactions.length > 0 ? (
            <EmptyState
              iconName="receipt"
              title="Tidak ada yang cocok"
              description="Tidak ada transaksi dengan filter ini. Coba tab atau kata pencarian lain."
            />
          ) : (
            <EmptyState
              iconName="receipt"
              title="Belum ada transaksi"
              description="Transaksi tercatat otomatis setiap kali Anda berjualan dengan scan barcode — bahkan tanpa internet."
            >
              <LinkButton href="/scan" className="mt-2">
                Mulai Jualan
              </LinkButton>
            </EmptyState>
          )
        ) : (
          filtered.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              queueItem={queueByTransaction.get(transaction.id)}
              onOpen={() => setOpened(transaction)}
            />
          ))
        )}
      </div>

      {filtered !== null && filtered.length > 0 ? (
        <p className="pt-1 text-center text-[11px] text-stone-400">
          Riwayat tersimpan di perangkat ini — ketuk untuk melihat bon lengkap
        </p>
      ) : null}

      {opened ? (
        <TransactionDetailSheet
          transaction={opened}
          queueItem={queueByTransaction.get(opened.id)}
          onClose={() => setOpened(null)}
        />
      ) : null}
    </div>
  );
}
