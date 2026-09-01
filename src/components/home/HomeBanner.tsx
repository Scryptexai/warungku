"use client";

/**
 * SAPAAN HARIAN di Beranda — foto warung hangat + salam sesuai jam WIB.
 * Membuka aplikasi terasa menyambut, bukan datar (§polish UI).
 */
export function HomeBanner() {
  const hour = Number(
    new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
  );
  const greeting =
    hour < 4 || hour >= 19
      ? "Selamat malam"
      : hour < 11
        ? "Selamat pagi"
        : hour < 15
          ? "Selamat siang"
          : "Selamat sore";

  return (
    <section
      aria-label="Sapaan"
      className="relative overflow-hidden rounded-3xl ring-1 ring-stone-900/5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- aset statis lokal (di-cache service worker) */}
      <img
        src="/images/hero-warung.jpg"
        alt="Ilustrasi warung dengan rak jajanan dan minuman"
        className="h-36 w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-stone-900/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-sm font-bold text-white drop-shadow-sm">
          {greeting}, Warungku! 👋
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/85">
          Semoga lancar jualannya hari ini — data tersimpan aman meski offline.
        </p>
      </div>
    </section>
  );
}
