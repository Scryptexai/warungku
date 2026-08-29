"use client";

import { Icon } from "@/components/ui/icons";

/** Pengatur jumlah barang: tombol besar − angka + (min. 1). */
export function QtyStepper({
  value,
  onChange,
  min = 1,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Kurangi jumlah"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 active:bg-stone-100 disabled:opacity-40"
      >
        <span className="text-xl font-bold leading-none">&minus;</span>
      </button>
      <span className="min-w-12 text-center text-2xl font-bold text-stone-900">
        {value}
      </span>
      <button
        type="button"
        aria-label="Tambah jumlah"
        onClick={() => onChange(value + 1)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white active:opacity-80"
      >
        <Icon name="plus" className="h-6 w-6" />
      </button>
    </div>
  );
}
