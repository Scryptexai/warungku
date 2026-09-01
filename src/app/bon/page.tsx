import type { Metadata } from "next";
import { BonScreen } from "@/components/bon/BonScreen";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Bayar Bon",
};

/**
 * HALAMAN PEMBAYARAN BON — kelola piutang pelanggan.
 * Lihat total piutang per pelanggan, klik → bayar sebagian/lunas.
 */
export default function BonPage() {
  return (
    <div className="px-4 pb-24 pt-5">
      <PageHeader
        iconName="receipt"
        title="Bayar Bon"
        subtitle="Lihat & lunasi piutang pelanggan"
      />
      <BonScreen />
    </div>
  );
}
