import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleSheetsCard } from "@/components/profile/GoogleSheetsCard";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { CURRENT_PHASE, TOTAL_ROADMAP_PHASES } from "@/config/app";

export const metadata: Metadata = {
  title: "Profil Warung",
};

/**
 * PROFIL WARUNG — identitas warung + koneksi Google Sheets (database warung).
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
        <Suspense
          fallback={
            <div className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-stone-900/5" />
          }
        >
          <GoogleSheetsCard />
        </Suspense>

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
