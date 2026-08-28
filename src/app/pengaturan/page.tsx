import type { Metadata } from "next";
import { SyncTestCard } from "@/components/settings/SyncTestCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseNotice } from "@/components/ui/PhaseNotice";
import { SectionCard } from "@/components/ui/SectionCard";
import { CURRENT_PHASE, TOTAL_ROADMAP_PHASES } from "@/config/app";
import { getPublicAppEnv } from "@/config/env";

export const metadata: Metadata = {
  title: "Pengaturan",
};

export default function PengaturanPage() {
  const env = getPublicAppEnv();

  return (
    <>
      <PageHeader
        iconName="settings"
        title="Pengaturan"
        subtitle="Koneksi Google dan informasi aplikasi"
      />
      <div className="space-y-4">
        <PhaseNotice
          phase={2}
          title="Koneksi Google menyusul"
          description="Pada Tahap 2, pemilik warung menghubungkan akun Google miliknya sendiri, lalu aplikasi menyiapkan Google Sheets khusus untuk warung itu. Kredensial hanya dibaca dari environment — tidak pernah ditulis di kode."
          points={[
            "Login dengan akun Google milik warung",
            "Google Sheets milik warung dibuat otomatis",
            "Data warung sepenuhnya dikuasai pemiliknya",
          ]}
        />

        <SectionCard
          title="Uji arsitektur sinkronisasi"
          description="Coba memasukkan operasi ke antrean sinkronisasi — data tetap aman di perangkat walau Google Sheets belum terhubung."
        >
          <SyncTestCard />
        </SectionCard>

        <SectionCard title="Tentang aplikasi">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-stone-500">Nama</dt>
            <dd className="font-medium text-stone-900">{env.appName}</dd>
            <dt className="text-stone-500">Lingkungan</dt>
            <dd className="font-medium text-stone-900">{env.appEnv}</dd>
            <dt className="text-stone-500">Tahap</dt>
            <dd className="font-medium text-stone-900">
              Tahap {CURRENT_PHASE} dari {TOTAL_ROADMAP_PHASES} — Fondasi
            </dd>
            <dt className="text-stone-500">Format</dt>
            <dd className="font-medium text-stone-900">
              {env.defaultCurrency} · {env.defaultLocale} · {env.defaultTimezone}
            </dd>
          </dl>
        </SectionCard>
      </div>
    </>
  );
}
