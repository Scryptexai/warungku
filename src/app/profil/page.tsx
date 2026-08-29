import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { CURRENT_PHASE, TOTAL_ROADMAP_PHASES } from "@/config/app";
import { Icon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Profil Warung",
};

/**
 * PROFIL WARUNG — identitas warung + status data.
 * Menjelaskan dengan bahasa sederhana ke mana data warung disimpan
 * (Google Sheets milik sendiri, mulai Tahap 4).
 */
export default function ProfilPage() {
  return (
    <div className="px-4 pb-24 pt-5">
      <PageHeader
        iconName="shop"
        title="Profil Warung"
        subtitle="Identitas warung dan status data Anda"
      />

      <div className="space-y-4">
        <ProfileForm />

        <SectionCard>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Icon name="cloudOff" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-stone-900">Data &amp; Google Sheets</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  Belum terhubung
                </span>
                <span className="text-[11px] text-stone-400">
                  Sambungan Google hadir di Tahap 4
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                Nanti, seluruh data warung — produk, transaksi, bon — tersimpan
                di Google Sheets milik Anda sendiri, bukan di server orang lain.
                Sementara itu, semua data tersimpan aman di perangkat ini.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Tentang Aplikasi">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-stone-500">Aplikasi</dt>
            <dd className="font-medium text-stone-900">Warungku</dd>
            <dt className="text-stone-500">Versi</dt>
            <dd className="font-medium text-stone-900">0.1.0</dd>
            <dt className="text-stone-500">Tahap</dt>
            <dd className="font-medium text-stone-900">
              Tahap {CURRENT_PHASE} dari {TOTAL_ROADMAP_PHASES}
            </dd>
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}
