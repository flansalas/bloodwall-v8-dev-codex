set -euo pipefail
mkdir -p src/app/me src/components

# 1) Find the original Me page anywhere like */app/(...)?me/page.(ts|tsx|js|jsx)
ME_PAGE=$(find ../bloodwall-v8-dev -type f \( -name 'page.tsx' -o -name 'page.jsx' -o -name 'page.ts' -o -name 'page.js' \) | grep -Ei '/app/(.*/)?me(/|$)' | head -1 || true)
if [ -z "${ME_PAGE:-}" ]; then
  echo "Could not locate a me/page.* in ../bloodwall-v8-dev"
  exit 1
fi
ME_DIR="$(dirname "$ME_PAGE")"
echo "Me page found at: $ME_DIR"
rsync -a "$ME_DIR"/ ./src/app/me/

# 2) Copy components (try common locations)
COPIED=0
for d in \
  ../bloodwall-v8-dev/src/components \
  ../bloodwall-v8-dev/components \
  ../bloodwall-v8-dev/apps/*/src/components \
  ../bloodwall-v8-dev/apps/*/components
do
  for p in $d; do
    if [ -d "$p" ]; then
      echo "Copying components from: $p"
      rsync -a "$p"/ ./src/components/
      COPIED=1
      break 2
    fi
  done
done
[ "$COPIED" = "1" ] && echo "Components copied." || echo "No separate components dir found; may not be needed."

echo "Transplant done."
