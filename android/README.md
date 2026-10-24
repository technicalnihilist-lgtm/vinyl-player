# Vinyl Player — Android app (APK)

A liquid-glass music player that plays **the songs already on your device**.

It is completely **offline**: the app requests no network permission at all and
never talks to the internet. Nothing is bundled and nothing is downloaded — the
APK ships with no audio (about 200 KB) and reads your existing music library
through Android's MediaStore, including the cover art embedded in each file.

## What's inside

```
android/
  AndroidManifest.xml                        app id, permissions, label, icon
  src/com/hubclue/vinylplayer/MainActivity.java   WebView shell, media bridge
  res/values/{strings,styles}.xml            app name, dark theme
  res/mipmap-*/ic_launcher.png               legacy launcher icons (API < 26)
  res/mipmap-anydpi-v26/ic_launcher.xml      adaptive icon (API 26+)
  res/mipmap-*/ic_launcher_background.png    liquid-glass body (rendered)
  res/drawable-nodpi/ic_launcher_foreground.png  the 3D record (rendered)
  res/drawable-nodpi/ic_launcher_monochrome.png  themed icon (Android 13+)
  res/drawable/ic_launcher_monochrome.xml    themed icon (Android 13+)
  gen_icons.py                               regenerates the launcher icons
  build.sh                                   builds + signs the APK
```

## How it works

The UI is the bundled web app, served from a private `https://` origin
(`appassets.androidplatform.net`) that the app intercepts and answers from its
own assets. The device's music reaches that UI in two ways:

1. **A JavaScript bridge** (`window.AndroidBridge`) reports the MediaStore
   contents as JSON — id, title, artist, album, duration.
2. **Two extra intercepted routes** — `/audio/<id>` and `/art/<id>` — stream the
   song and its embedded cover art back from the same origin.

Serving the media from our own origin (rather than `content://` or `file://`)
keeps it same-origin with the page, which means the Web Audio analyser can read
it — so the visualiser genuinely reacts to your music.

`/art/<id>` uses `MediaMetadataRetriever.getEmbeddedPicture()`, cached in an
`LruCache`. Many files have no picture at all, so the UI always paints a
generated cover underneath and simply hides the real image if there isn't one.

The library is rescanned on resume, so music you add while the app is in the
background shows up next time you open it.

## Permissions

| Permission | Why |
|---|---|
| `READ_MEDIA_AUDIO` (Android 13+) | read the device's music library |
| `READ_EXTERNAL_STORAGE` (maxSdk 32) | same, on older releases |

There is deliberately **no `INTERNET` permission** — the app cannot reach the
network even if it wanted to.

The app asks for music access on first launch; if you decline, the empty state
offers a button to ask again or to open the app's settings.

## Rebuilding

You need a JDK 17 and Android build-tools 34 + platform 34. `build.sh` expects
them at the paths in the script; edit `JAVA_HOME`, `ANDROID_JAR` and the
build-tools path if yours differ.

```bash
# 1. build the web UI first (from the vinyl-player folder)
npm install && npm run build

# 2. then build the APK
cd android
bash build.sh
# → build/vinyl-player.apk
```

## Installing

```bash
adb install -r vinyl-player.apk
```

Or copy the APK to the device and open it (allow "install unknown apps").
It is signed with a debug key — fine for sideloading, not for the Play Store.

## Notes / limitations

- **Package id:** `com.hubclue.vinylplayer` · versionName `42.0` · versionCode `42`
- **High refresh rate.** On launch the app asks for the display's fastest mode at
  the current resolution (e.g. 120 Hz) instead of accepting the 60 Hz default. It
  only ever moves *up* to a mode the panel already advertises, so 60 Hz devices
  and battery-saver modes are unaffected.
- **Tuned for smoothness.** The web UI avoids the effects that cost a full-screen
  pass every frame (no `backdrop-filter`, no full-screen grain, no canvas
  `shadowBlur`, no animated box-shadows, no layout-property transitions); the
  ambient field runs entirely on the compositor.
- **minSdk 21 (Android 5.0), targetSdk 34 (Android 14).**
- **Rotation follows the device** (`screenOrientation="unspecified"`), so it
  honours the phone's own auto-rotate switch.
- **Fully offline.** The WebView is only ever allowed to load the app's own
  bundled content; every other navigation is refused, and there is no network
  permission to use.
- Only files Android's media scanner has indexed are listed. If a song is
  missing, make sure it is in a normal Music folder and has been scanned.
- The APK was built and structurally verified (signature schemes v1/v2/v3, dex
  magic, manifest permissions, bundled UI, no bundled audio) but was **not
  launched on a device or emulator** in the build environment — there is no
  `/dev/kvm` here. The web layer is covered by an automated browser suite that
  runs the app against a simulated device library.
