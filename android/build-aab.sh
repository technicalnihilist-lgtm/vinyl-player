#!/usr/bin/env bash
#
# Builds the Android App Bundle (.aab) that the Play Store wants.
#
# Play requires an AAB for new apps, and an AAB has to be assembled by
# bundletool — hand-zipping one produces a bundle bundletool itself rejects.
# Run build.sh first: this reuses the resources and dex it produced.
#
#   JAVA_HOME / ANDROID_HOME   as in build.sh
#   BUNDLETOOL                 path to bundletool-all-<version>.jar
#   VERSION_CODE / VERSION_NAME
#   RELEASE_KEYSTORE etc.      only needed to verify the result
#
# It writes build/vinyl-player.aab.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
VERSION_CODE="${VERSION_CODE:-54}"
VERSION_NAME="${VERSION_NAME:-54.0}"
BUNDLETOOL="${BUNDLETOOL:-}"

if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then PATH="$JAVA_HOME/bin:$PATH"; fi
[ -n "$BUNDLETOOL" ] && [ -f "$BUNDLETOOL" ] || { echo "!! set BUNDLETOOL to bundletool-all-<version>.jar" >&2; exit 1; }

AAPT2="$(ls -d "$SDK"/build-tools/*/aapt2 2>/dev/null | sort -rV | head -1)"
ANDROID_JAR="$(ls -d "$SDK"/platforms/android-*/android.jar 2>/dev/null | sort -rV | head -1)"
[ -f "$ROOT/build/res.zip" ] || { echo "!! run build.sh first" >&2; exit 1; }
[ -d "$ROOT/build/dex" ] || { echo "!! run build.sh first" >&2; exit 1; }

cd "$ROOT"
echo "==> linking in proto format"
rm -rf build/proto.apk build/aab build/base.zip
"$AAPT2" link --proto-format -o build/proto.apk \
  -I "$ANDROID_JAR" --manifest AndroidManifest.xml -R build/res.zip -A assets \
  --min-sdk-version 21 --target-sdk-version 36 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" --auto-add-overlay

echo "==> assembling the base module"
mkdir -p build/aab/base/manifest build/aab/base/dex
unzip -q build/proto.apk -d build/aab/proto
mv build/aab/proto/AndroidManifest.xml build/aab/base/manifest/
[ -d build/aab/proto/res ] && cp -r build/aab/proto/res build/aab/base/res
[ -f build/aab/proto/resources.pb ] && cp build/aab/proto/resources.pb build/aab/base/resources.pb
[ -d build/aab/proto/assets ] && cp -r build/aab/proto/assets build/aab/base/assets
cp build/dex/classes.dex build/aab/base/dex/classes.dex
rm -rf build/aab/proto

echo "==> zipping the module (files only — a module zip may not hold directories)"
python3 - <<'PY'
import os, zipfile
src = 'build/aab/base'
out = 'build/base.zip'
files = []
for root, _d, names in os.walk(src):
    for n in names:
        full = os.path.join(root, n)
        files.append((os.path.relpath(full, src).replace(os.sep, '/'), full))
files.sort()
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for rel, full in files:
        zi = zipfile.ZipInfo(rel, date_time=(1980, 1, 1, 0, 0, 0))
        zi.compress_type = zipfile.ZIP_DEFLATED
        zi.external_attr = 0o644 << 16
        z.writestr(zi, open(full, 'rb').read())
print(f"    {len(files)} files")
PY

echo "==> bundletool build-bundle"
java -jar "$BUNDLETOOL" build-bundle --modules=build/base.zip --output=build/vinyl-player.aab --overwrite
java -jar "$BUNDLETOOL" validate --bundle=build/vinyl-player.aab | head -6
ls -la build/vinyl-player.aab
echo
echo "AAB ready: $ROOT/build/vinyl-player.aab"
