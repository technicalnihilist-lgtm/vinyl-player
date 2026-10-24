# Installing Vinyl Player on each platform

The player is one app — the same interface everywhere — but devices differ, so
there is a build for each of them.

| Platform | What to get | Where |
|---|---|---|
| **Android** | `vinyl-player.apk` | [release](../../releases/latest) or the [download page](https://technicalnihilist-lgtm.github.io/vinyl-player/) |
| **Windows 10 / 11** | `Vinyl-Player-*-setup.exe` (installer) or `*-portable.exe` (no install) | [release](../../releases/latest) |
| **macOS 11+** | `Vinyl-Player-*.dmg` (Intel and Apple silicon) | [release](../../releases/latest) |
| **Linux** | `Vinyl-Player-*.AppImage` | [release](../../releases/latest) |
| **iPhone / iPad** | the web app, added to the home screen | [download page](https://technicalnihilist-lgtm.github.io/vinyl-player/) |
| **Any modern browser** | the web app itself | [download page](https://technicalnihilist-lgtm.github.io/vinyl-player/) |

---

## Android

1. Download `vinyl-player.apk` and open it.
2. Android asks once — allow **"install unknown apps"** for your browser or file
   manager.
3. Open the app and allow **music access**. Your library appears.

Reads the phone's media library through MediaStore, including the cover art
embedded in each file. Requires Android 5.0 (API 21) or newer.

## Windows

Run `Vinyl-Player-50.0.0-setup.exe` and follow the installer, or take
`Vinyl-Player-50.0.0-portable.exe` if you would rather not install anything —
it runs straight from wherever you put it.

The Windows build is not code-signed, so SmartScreen may show a "Windows
protected your PC" notice the first time. Choose **More info → Run anyway**.

## macOS

Open the `.dmg` and drag **Vinyl Player** into Applications. Both Intel and
Apple silicon builds are in the release.

The build is unsigned (there is no paid Apple Developer certificate behind this
project), so the first launch needs **right-click → Open** instead of a double
click, or *System Settings → Privacy & Security → Open Anyway*.

## Linux

```bash
chmod +x Vinyl-Player-50.0.0.AppImage
./Vinyl-Player-50.0.0.AppImage
```

## iPhone and iPad

There is no `.ipa` here, and that is deliberate rather than an oversight:
shipping a native iOS build needs Xcode on a Mac and a paid Apple Developer
account to sign it, so it cannot be produced from this repository alone.

The practical way to get the app onto an iPhone or iPad is the **web app**, and
it is a real app once installed:

1. Open **Safari** and go to
   <https://technicalnihilist-lgtm.github.io/vinyl-player/>
2. Tap **Share** → **Add to Home Screen**.
3. Launch it from the home screen.

It then runs full screen with its own icon, no Safari chrome, and keeps working
with no network at all — the service worker caches the whole app. You add your
music with the **Add files** button (Files app / iCloud Drive). The same steps
work on iPadOS.

If you do want a native iOS build, the shell in `desktop/` is Electron (desktop
only), so the route would be to wrap the same `web/dist` with
[Capacitor](https://capacitorjs.com) on a Mac:

```bash
cd web && npm run build
npx cap init "Vinyl Player" com.hubclue.vinylplayer --web-dir=dist
npx cap add ios
npx cap sync ios
npx cap open ios     # then Run in Xcode
```

Nothing about the player needs to change — it is the same web build the desktop
and Android versions already use.

## Any browser, any OS

The download page is itself an installable app. In Chrome or Edge, look for the
**install** icon in the address bar (or *⋮ → Apps → Install this site as an
app*). You get a window of its own, a taskbar/Start entry, and full offline
support — on Windows, macOS, Linux, ChromeOS, Android and iPadOS alike.

---

## Why the app behaves slightly differently per platform

Only one thing really differs: **where the music comes from.**

- **Android** — the app reads the system media library, so your songs are simply
  there the moment you allow access, cover art included.
- **Everywhere else** — there is no system media library a web app may read, so
  you point the app at files or a folder with **Add files** / **Add a folder**.
  Everything after that — playback, artwork, the vinyl, the visualiser, the
  settings — is identical.

Nothing is uploaded anywhere on any platform. The app makes no network requests
at all.
