import Link from "next/link";

/** Halaman tidak ditemukan — bahasa sederhana, arahkan pulang. */
export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-2xl">
        🧭
      </span>
      <h1 className="text-base font-bold text-stone-900">Halaman tidak ditemukan</h1>
      <p className="max-w-[30ch] text-xs leading-relaxed text-stone-500">
        Alamat yang Anda buka tidak ada di Warungku.
      </p>
      <Link
        href="/"
        className="mt-2 flex min-h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-bold text-white active:scale-[0.98]"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
