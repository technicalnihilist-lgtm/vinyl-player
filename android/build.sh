#!/usr/bin/env bash
#
# Build a signed, installable APK for Vinyl Player using the Android
# build-tools directly — no Gradle, no Android Studio.
#
# Everything is discovered from the environment, so the same script works on a
# laptop and in GitHub Actions:
#
#   JAVA_HOME      a JDK 17            (falls back to `javac` on PATH)
#   ANDROID_HOME   an Android SDK      (or ANDROID_SDK_ROOT)
#   WEB_DIST       the built web app   (defaults to ../web/dist)
#   VERSION_CODE / VERSION_NAME        (default 75 / 75.0)
#
#   RELEASE_KEYSTORE                   path to your upload key (.jks/.keystore)
#   RELEASE_STORE_PASSWORD             its store password
#   RELEASE_KEY_ALIAS                  the key alias inside it
#   RELEASE_KEY_PASSWORD               that key's password
#
# With the RELEASE_* variables set the APK is signed with your upload key, which
# is what the Play Store needs. Without them it falls back to a throwaway debug
# key, which is fine for sideloading but cannot be uploaded to Play.
#
# It writes build/vinyl-player.apk.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"

WEB_DIST="${WEB_DIST:-$REPO/web/dist}"
VERSION_CODE="${VERSION_CODE:-75}"
VERSION_NAME="${VERSION_NAME:-75.0}"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"

if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/javac" ]; then
  PATH="$JAVA_HOME/bin:$PATH"
fi

# ---------------------------------------------------------------- find tools
# build-tools are versioned directories; take the newest one that has aapt2.
find_build_tool() {
  local name="$1" d
  if [ -n "$SDK" ]; then
    for d in $(ls -d "$SDK"/build-tools/*/ 2>/dev/null | sort -rV); do
      if [ -x "${d}${name}" ]; then echo "${d}${name}"; return 0; fi
    done
  fi
  command -v "$name" 2>/dev/null && return 0
  echo "!! cannot find $name — set ANDROID_HOME to an Android SDK" >&2
  return 1
}

find_android_jar() {
  local p
  # newest platform first: Play wants a recent target API level
  for p in $(ls -d "$SDK"/platforms/android-*/ 2>/dev/null | sort -rV); do
    [ -f "${p}android.jar" ] && { echo "${p}android.jar"; return 0; }
  done
  echo "!! cannot find android.jar — install platforms;android-36" >&2
  return 1
}

AAPT2="$(find_build_tool aapt2)"
D8="$(find_build_tool d8)"
ZIPALIGN="$(find_build_tool zipalign)"
APKSIGNER="$(find_build_tool apksigner)"
KEYTOOL="$(command -v keytool || echo "${JAVA_HOME:-}/bin/keytool")"
JAVAC="$(command -v javac || echo "${JAVA_HOME:-}/bin/javac")"
ANDROID_JAR="$(find_android_jar)"

[ -d "$WEB_DIST" ] || { echo "!! $WEB_DIST is missing — build the web app first (cd web && npm ci && npm run build)" >&2; exit 1; }

cd "$ROOT"

echo "==> staging the web app"
rm -rf assets && mkdir -p assets/www
cp -r "$WEB_DIST"/. assets/www/
echo "    $(find assets/www -type f | wc -l) files, $(du -sh assets/www | cut -f1)"

echo "==> compiling java"
rm -rf build && mkdir -p build/classes build/dex
"$JAVAC" -source 8 -target 8 -Xlint:-options \
  -classpath "$ANDROID_JAR" \
  -d build/classes \
  src/com/hubclue/vinylplayer/MainActivity.java

echo "==> dexing"
"$D8" --release --lib "$ANDROID_JAR" --min-api 21 --output build/dex \
  $(find build/classes -name '*.class')

echo "==> compiling resources"
"$AAPT2" compile --dir res -o build/res.zip

echo "==> linking"
"$AAPT2" link -o build/base.apk \
  -I "$ANDROID_JAR" \
  --manifest AndroidManifest.xml \
  -R build/res.zip \
  -A assets \
  --min-sdk-version 21 --target-sdk-version 36 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -0 mp3 \
  --auto-add-overlay

echo "==> adding classes.dex"
(cd build/dex && zip -q -j ../base.apk classes.dex)

echo "==> aligning"
"$ZIPALIGN" -f -p 4 build/base.apk build/aligned.apk

echo "==> signing"
if [ -n "${RELEASE_KEYSTORE:-}" ] && [ -f "${RELEASE_KEYSTORE}" ]; then
  echo "    with your upload key ($RELEASE_KEYSTORE)"
  "$APKSIGNER" sign --ks "$RELEASE_KEYSTORE" \
    --ks-pass "pass:${RELEASE_STORE_PASSWORD:?set RELEASE_STORE_PASSWORD}" \
    --key-pass "pass:${RELEASE_KEY_PASSWORD:?set RELEASE_KEY_PASSWORD}" \
    --ks-key-alias "${RELEASE_KEY_ALIAS:?set RELEASE_KEY_ALIAS}" \
    --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
    --out build/vinyl-player.apk build/aligned.apk
else
  echo "    with a throwaway debug key (set RELEASE_KEYSTORE for a Play upload)"
  if [ ! -f debug.keystore ]; then
    "$KEYTOOL" -genkeypair -keystore debug.keystore -storepass android -keypass android \
      -alias androiddebugkey -dname "CN=Android Debug,O=Android,C=US" \
      -keyalg RSA -keysize 2048 -validity 10000 -noprompt
  fi
  "$APKSIGNER" sign --ks debug.keystore --ks-pass pass:android --key-pass pass:android \
    --ks-key-alias androiddebugkey \
    --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
    --out build/vinyl-player.apk build/aligned.apk
fi

echo "==> verifying"
"$APKSIGNER" verify --verbose build/vinyl-player.apk | head -6
"$AAPT2" dump badging build/vinyl-player.apk | head -4
ls -la build/vinyl-player.apk
echo
echo "APK ready: $ROOT/build/vinyl-player.apk"
