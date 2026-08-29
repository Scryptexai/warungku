"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { cn } from "@/lib/cn";

const TABS = ["Semua", "Tunai", "Bon"] as const;
type Tab = (typeof TABS)[number];

/**
 * Kerangka layar Transaksi: tab jenis pembayaran + keadaan kosong.
 * Pencatatan transaksi sungguhan aktif di Tahap 3.
 */
export function TransactionsScreen() {
  const [tab, setTab] = useState<Tab>("Semua");

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

      {tab === "Bon" ? (
        <EmptyState
          iconName="receipt"
          title="Belum ada bon"
          description="Setiap transaksi bon (bayar nanti) otomatis tercatat dengan nama pembelinya. Daftar & pencarian bon hadir di Tahap 4."
        >
          <LinkButton href="/scan" className="mt-2">
            Mulai Jualan
          </LinkButton>
        </EmptyState>
      ) : (
        <EmptyState
          iconName="receipt"
          title={tab === "Tunai" ? "Belum ada transaksi tunai" : "Belum ada transaksi"}
          description="Transaksi tercatat otomatis setiap kali Anda berjualan dengan scan barcode. Riwayat & pencarian lengkap hadir di Tahap 4."
        >
          <LinkButton href="/scan" className="mt-2">
            Mulai Jualan
          </LinkButton>
        </EmptyState>
      )}

      <p className="text-center text-[11px] text-stone-400">
        Riwayat &amp; pencarian transaksi lengkap hadir di Tahap 4
      </p>
    </div>
  );
}
