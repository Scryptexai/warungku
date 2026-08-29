import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Asisten AI",
};

const EXAMPLE_QUESTIONS = [
  "Produk apa yang paling laku minggu ini?",
  "Produk mana yang mulai sepi?",
  "Stok minyak tinggal berapa?",
  "Produk apa yang harus saya tambah?",
  "Berapa omset bulan ini?",
];

/**
 * Kerangka layar Asisten AI — tampilan percakapan yang sudah akrab.
 * Kemampuan menjawab (dari data penjualan & stok warung sendiri) aktif di Tahap 6.
 */
export default function AiPage() {
  return (
    <div className="px-4 pb-24 pt-5">
      <PageHeader
        iconName="sparkles"
        title="Asisten AI"
        subtitle="Tanya apa saja soal warung Anda"
      />

      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
            <Icon name="sparkles" className="h-5 w-5" />
          </span>
          <div className="rounded-2xl rounded-tl-sm bg-white p-3.5 text-sm leading-relaxed text-stone-700 ring-1 ring-stone-900/5">
            Halo! 👋 Saya asisten bisnis warung Anda. Mulai <b>Tahap 6</b>, saya
            bisa menjawab pertanyaan langsung dari data penjualan dan stok warung
            Anda sendiri.
          </div>
        </div>

        <section aria-label="Contoh pertanyaan">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">
            Coba tanya seperti ini
          </h2>
          <ul className="space-y-2">
            {EXAMPLE_QUESTIONS.map((question) => (
              <li
                key={question}
                className="rounded-xl bg-white px-3.5 py-2.5 text-sm text-stone-600 ring-1 ring-stone-900/5"
              >
                “{question}”
              </li>
            ))}
          </ul>
        </section>

        <div className="flex items-center gap-3 rounded-full bg-white px-4 py-3 ring-1 ring-stone-900/5">
          <input
            disabled
            placeholder="Ketik pertanyaan Anda…"
            aria-label="Pertanyaan untuk asisten AI"
            className="flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400 disabled:cursor-not-allowed"
          />
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-400">
            <Icon name="send" className="h-4 w-4" />
          </span>
        </div>

        <p className="text-center text-[11px] text-stone-400">
          Asisten AI aktif di Tahap 6 — setelah data penjualan mulai terkumpul
        </p>
      </div>
    </div>
  );
}
