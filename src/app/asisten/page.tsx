import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseNotice } from "@/components/ui/PhaseNotice";
import { SectionCard } from "@/components/ui/SectionCard";

export const metadata: Metadata = {
  title: "Asisten AI",
};

export default function AsistenPage() {
  return (
    <>
      <PageHeader
        iconName="sparkles"
        title="Asisten AI"
        subtitle="Tanya apa saja soal warung Anda"
      />
      <div className="space-y-4">
        <PhaseNotice
          phase={6}
          title="Asisten AI menyusul"
          description="Asisten bisnis berbahasa natural dibangun pada Tahap 6 di atas seluruh data warung yang tersinkron di Google Sheets."
          points={[
            "Tanya pakai bahasa sehari-hari",
            "Analisis penjualan dan produk terlaris",
            "Pantau bon pelanggan dan stok menipis",
            "Saran bisnis yang mudah dipahami",
          ]}
        />
        <SectionCard title="Contoh pertanyaan yang direncanakan">
          <ul className="space-y-2 text-sm text-stone-600">
            <li className="rounded-xl bg-stone-50 px-3 py-2">&ldquo;Omzet kemarin berapa?&rdquo;</li>
            <li className="rounded-xl bg-stone-50 px-3 py-2">&ldquo;Produk apa yang paling laris minggu ini?&rdquo;</li>
            <li className="rounded-xl bg-stone-50 px-3 py-2">&ldquo;Siapa saja yang masih punya bon?&rdquo;</li>
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
