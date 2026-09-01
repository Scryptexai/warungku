/*
 * WARUNGKU — Service Worker (PWA offline-first).
 *
 * Strategi:
 * - Aset statis Next.js (/_next/static/...): CACHE-FIRST — nama file sudah
 *   ber-hash, aman di-cache selamanya.
 * - Halaman (navigasi): NETWORK-FIRST dengan cadangan cache — saat online
 *   selalu segar, saat offline dibuka dari cache terakhir.
 * - Ikon & manifest: cache-first.
 *
 * Data transaksi/produk TIDAK disimpan service worker — itu tugas database
 * perangkat (localStorage) lewat LocalStore. SW hanya menjamin SHELL aplikasi
 * bisa dibuka tanpa internet.
 */

const VERSION = "warungku-v2";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;

// Seluruh SHELL di-precache saat instalasi — warung bisa langsung buka
// kasir/laporan/AI secara OFFLINE SEBELUM pernah membuka halaman itu
// (syarat §6: aplikasi terasa "selalu online" meski jaringan mati).
const PRECACHE_URLS = [
  "/",
  "/scan",
  "/produk",
  "/transaksi",
  "/bon",
  "/laporan",
  "/ai",
  "/profil",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/images/hero-warung.jpg",
  "/images/ai-assistant.jpg",
  "/images/empty-transaksi.jpg",
  "/images/empty-produk.jpg",
  "/images/empty-bon.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);
      // Halaman beranda di-precache; kegagalan item lain tidak menggagalkan instalasi.
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // biarkan Google/proxy lewat langsung

  // Aset statis → cache-first (file ber-hash, tidak pernah berubah isi).
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  // Navigasi halaman → network-first, cadangan cache (offline).
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const home = await caches.match("/");
          if (home) return home;
          return new Response(
            "<!doctype html><html lang=id><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><body style='font-family:system-ui;padding:2rem;text-align:center;color:#444'>Halaman belum pernah dibuka saat online. Buka aplikasi dari Beranda (tombol kembali), lalu coba lagi.</body></html>",
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
  }
});
