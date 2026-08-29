import type { NextConfig } from "next";

/**
 * Konfigurasi Next.js Warungku.
 *
 * Catatan arsitektur:
 * - Tahap 2 akan menambahkan API routes server-side untuk Google OAuth
 *   (/api/auth/google/...) dan tidak memerlukan konfigurasi khusus di sini.
 * - Konfigurasi sengaja dijaga minimal dan eksplisit agar mudah diaudit.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
