import { HomeHeader } from "@/components/home/HomeHeader";
import { QuickAccess } from "@/components/home/QuickAccess";
import { RecentActivity } from "@/components/home/RecentActivity";
import { SyncStatusCard } from "@/components/home/SyncStatusCard";
import { ScanHero } from "@/components/home/ScanHero";
import { TodaySummaryCard } from "@/components/home/TodaySummaryCard";
import { CURRENT_PHASE, CURRENT_PHASE_LABEL, TOTAL_ROADMAP_PHASES } from "@/config/app";

/**
 * BERANDA — mengikuti pola aplikasi dompet digital:
 * 1. Header profil warung   2. Ringkasan hari ini
 * 3. Aksi utama: SCAN       4. Pintasan ikon
 * 5. Aktivitas terakhir     6. Navigasi bawah (di AppShell)
 */
export default function HomePage() {
  return (
    <div className="pb-24">
      <HomeHeader />
      <div className="-mt-8 px-4">
        <TodaySummaryCard />
      </div>
      <div className="mt-4 px-4">
        <ScanHero />
      </div>
      <div className="mt-5 px-4">
        <QuickAccess />
      </div>
      <div className="mt-5 px-4">
        <RecentActivity />
      </div>
      <div className="mt-5 px-4">
        <SyncStatusCard />
      </div>
      <p className="mt-6 px-4 text-center text-[11px] text-stone-400">
        Warungku · Tahap {CURRENT_PHASE} dari {TOTAL_ROADMAP_PHASES} —{" "}
        {CURRENT_PHASE_LABEL}
      </p>
    </div>
  );
}
