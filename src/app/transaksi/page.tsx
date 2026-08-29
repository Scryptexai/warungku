import type { Metadata } from "next";
import { TransactionsScreen } from "@/components/transactions/TransactionsScreen";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Transaksi",
};

export default function TransaksiPage() {
  return (
    <div className="px-4 pb-24 pt-5">
      <PageHeader
        iconName="receipt"
        title="Transaksi"
        subtitle="Riwayat penjualan tunai dan bon"
      />
      <TransactionsScreen />
    </div>
  );
}
