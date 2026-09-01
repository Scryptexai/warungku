import type { Metadata } from "next";
import { AiScreen } from "@/components/ai/AiScreen";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "AI Toko",
};

/**
 * Layar ASISTEN AI TOKO (§8) — menjawab pertanyaan bisnis dari data
 * perangkat (penjualan, produk, stok, bon). Model jarak jauh opsional;
 * mode lokal deterministik selalu tersedia offline.
 */
export default function AiPage() {
  return (
    <div className="px-4 pb-24 pt-5">
      <PageHeader
        iconName="sparkles"
        title="AI Toko"
        subtitle="Tanya soal penjualan, produk, stok, & bon warung Anda"
      />
      <AiScreen />
    </div>
  );
}
