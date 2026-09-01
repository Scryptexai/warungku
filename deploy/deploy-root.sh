#!/usr/bin/env bash
# ===========================================================================
# Langkah deploy yang butuh root — Warungku @ app.tritan.cloud
# (Cloudflare PROXIED / orange cloud)
#
# Jalankan:
#     sudo bash /home/dev/warungku/deploy/deploy-root.sh
#
# Idempotent & aman diulang. Melakukan:
#   1) Buka firewall UFW (80 + 443)
#   2) Buat sertifikat SELF-SIGNED untuk origin (kalau belum ada)
#   3) Pasang konfigurasi nginx app.tritan.cloud
#   4) nginx -t + reload
#
# Self-signed sudah cukup untuk Cloudflare SSL mode "Full".
# Untuk "Full (strict)": ganti kedua file di $SSL_DIR dengan Cloudflare
# Origin Certificate, lalu: sudo systemctl reload nginx
# ===========================================================================
set -euo pipefail

SRC=/home/dev/warungku/deploy/nginx/app.tritan.cloud.conf
DEST=/etc/nginx/sites-available/app.tritan.cloud
SSL_DIR=/etc/nginx/ssl/app.tritan.cloud

echo "==> [1/4] Membuka firewall UFW untuk Nginx (80 + 443)"
ufw allow 'Nginx Full' || true

echo "==> [2/4] Menyiapkan sertifikat origin di $SSL_DIR"
mkdir -p "$SSL_DIR"
if [ -s "$SSL_DIR/fullchain.pem" ] && [ -s "$SSL_DIR/privkey.pem" ]; then
  echo "    (sertifikat sudah ada — dibiarkan)"
else
  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -keyout "$SSL_DIR/privkey.pem" \
    -out "$SSL_DIR/fullchain.pem" \
    -subj "/CN=app.tritan.cloud" >/dev/null 2>&1
  chmod 600 "$SSL_DIR/privkey.pem"
  echo "    self-signed cert dibuat (berlaku 10 tahun)"
fi

echo "==> [3/4] Memasang konfigurasi situs app.tritan.cloud"
cp "$SRC" "$DEST"
ln -sf "$DEST" /etc/nginx/sites-enabled/app.tritan.cloud
# Bersihkan sisa konfigurasi domain lama bila ada.
rm -f /etc/nginx/sites-enabled/intent.sbs /etc/nginx/sites-available/intent.sbs

echo "==> [4/4] Uji & reload nginx"
nginx -t
systemctl reload nginx

echo
echo "SELESAI. Origin kini melayani HTTP (80) & HTTPS (443) untuk app.tritan.cloud"
echo "         -> proxy ke 127.0.0.1:3000 (pm2: warungku)."
echo
echo "Cek dari luar:  curl -sI https://app.tritan.cloud/"
echo "Jika muncul HTTP 526 (invalid cert) berarti Cloudflare mode = Full(strict):"
echo "  ganti $SSL_DIR/{fullchain,privkey}.pem dengan Cloudflare Origin Certificate,"
echo "  lalu: sudo systemctl reload nginx"
