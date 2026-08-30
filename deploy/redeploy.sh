#!/usr/bin/env bash
# ===========================================================================
# Reload perubahan terbaru ke domain app.tritan.cloud dalam SATU perintah.
#
# Pemakaian:
#   bash deploy/redeploy.sh            # build ulang + restart (pakai kode yg ada)
#   bash deploy/redeploy.sh --pull     # git pull dulu, baru build + restart
#
# Kenapa perlu build ulang setelah pull?
#   - Variabel NEXT_PUBLIC_* (mis. NEXT_PUBLIC_APP_URL) DITANAM saat build.
#   - Folder .next/ (hasil build) di-gitignore, jadi harus dibuat ulang.
# Aman diulang berkali-kali (idempotent).
# ===========================================================================
set -euo pipefail
cd /home/dev/warungku

if [ "${1:-}" = "--pull" ]; then
  echo "==> [git] Menarik kode terbaru (fast-forward saja)"
  git pull --ff-only
fi

echo "==> [deps] Cek dependency"
# npm ci hanya bila package-lock.json berubah (kalau tidak, dilewati — cepat).
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.ci-stamp ]; then
  echo "    lockfile berubah / node_modules kosong → npm ci"
  npm ci
  touch node_modules/.ci-stamp
else
  echo "    (dependency tidak berubah — dilewati)"
fi

echo "==> [build] Build produksi (folder .next dibuat ulang)"
npm run build

echo "==> [pm2] Restart aplikasi 'warungku' + muat ulang .env"
pm2 restart warungku --update-env
pm2 save >/dev/null 2>&1 || true

echo
echo "SELESAI ✅  Perubahan sudah live di https://app.tritan.cloud"
echo "Cek cepat:  curl -sI https://app.tritan.cloud/"
