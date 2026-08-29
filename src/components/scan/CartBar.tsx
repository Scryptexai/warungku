"use client";

import { Icon } from "@/components/ui/icons";
import { formatIDR } from "@/lib/money";

/** Bilah keranjang melekat di atas navigasi bawah: total + tombol Bayar. */
export function CartBar({
  itemCount,
  total,
  onPay,
}: {
  itemCount: number;
  total: number;
  onPay: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPay}
      className="flex w-full items-center gap-3 rounded-2xl bg-brand-600 p-3.5 text-white shadow-lg shadow-brand-600/30 active:opacity-90"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Icon name="cart" className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[11px] font-medium text-white/75">
          {itemCount} barang dalam transaksi
        </span>
        <span className="block text-base font-bold">{formatIDR(total)}</span>
      </span>
      <span className="flex min-h-10 items-center gap-1 rounded-xl bg-white px-3.5 text-sm font-bold text-brand-700">
        Bayar
        <Icon name="chevronRight" className="h-4 w-4" />
      </span>
    </button>
  );
}
