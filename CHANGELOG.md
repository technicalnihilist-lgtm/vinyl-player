# Changelog

Every change to Vinyl Player is committed here, in the same breath as the change
itself. There is no separate release step to forget: if a fix is made, it is on
GitHub. The version number below is the one the app reports in
**Settings → More → About**, and the one stamped into the Android manifest.

---

## 72 — 25 October 2026

**The opening screen said "Version 50".** It was a hard-coded string in the splash
component, written once when the app launched and never touched again — so it
said 50 through twenty-two releases. It reads the real version now, the same one
`package.json` carries and the build stamps in, so it cannot drift again.

**The website needed editing by hand for every release.** The version and the APK
size were typed into `docs/index.html`. The page now reads them from the latest
GitHub release, so a new release updates the page by itself. The download links
already pointed at `releases/latest`. If the call fails — offline, or GitHub
rate-limiting — the static text stands and nothing breaks.

Three more optimisations:

- **Storage writes are debounced.** Dragging the glass or corner slider wrote to
  local storage on every step of the drag. One write, a moment later, is the same
  thing.
- **The pointer sheen only runs where there is a real pointer.** `pointermove`
  fires for touch too, including while scrolling, so it was doing a
  `getBoundingClientRect` and two style writes on every scroll frame to move a
  highlight nobody could see on a phone. It is limited to fine pointers and to
  one write per frame now.
- **The row stagger moved into CSS.** Every row carried an inline custom property
  to stagger its entrance. `nth-child` does the same job, and a library of a few
  hundred songs no longer carries a style object per row.

## 71 — 25 October 2026

**Every build is signed with the upload key now.**

This is the one that matters. Until now the workflow never handed `build.sh` an
upload key, so every release fell back to a throwaway debug key — **and a
different one each run**:

```
v60 release APK  ->  cert b5e944c4...   (Android Debug)
v70 release APK  ->  cert a0295694...   (Android Debug)
```

Android refuses to install an APK over one signed with a different key, so the
v70 update could never install over v60. The app stayed on 60, the store kept
offering an update that could never land, and Play would have rejected the App
Bundle as well.

The workflow now writes the upload key from `KEYSTORE_BASE64` and passes the
`RELEASE_*` variables to both the APK and the App Bundle builds. Without that
secret it warns loudly rather than failing quietly. `build.sh` also keeps the
debug keystore it generates instead of making a new one every run.

**If the app on your phone was signed with a debug key, uninstall it once** — the
correctly-signed build will not install over it. After that, every update
installs normally.

## 70 — 24 October 2026

**Only the first screenful animates in.** Every row ran the entrance animation,
so a long library kept animating for seconds after it was already on screen. The
first fourteen rows animate; the rest simply appear.

## 69 — 24 October 2026

**An unchanged now-playing payload is no longer sent.** The page compared
nothing, so an identical payload crossed the bridge each time the effect ran.

## 68 — 24 October 2026

**Dead custom properties removed.** `--glass-blur`, `--glass-sat`,
`--glass-tint`, `--glass-tint-2` and `--r-lg` were declared and never read.

## 67 — 24 October 2026

**The drift stops when nothing is playing.** Three continuous compositor
animations ran whether or not any music was playing. They now pause while the
player is idle.

## 66 — 24 October 2026

**The list no longer chains its scroll to the page.** `overscroll-behavior:
contain` stops it handing the scroll on at the ends, which reads as a jolt.

## 65 — 24 October 2026

**Album art decodes off the main thread.** `loading="lazy"` and
`decoding="async"` on every cover image.

## 64 — 24 October 2026

**The glass halo trimmed.** A 44px blur behind every glass surface became 26px.

## 63 — 24 October 2026

**The visualiser runs at 30fps, not 60.** It was a full canvas redraw every
frame for a difference nobody can see.

## 62 — 24 October 2026

**Off-screen rows are skipped entirely.** `content-visibility: auto` with
`contain-intrinsic-size` means a library of a few hundred songs no longer lays
out and paints the whole library to show ten rows.

## 61 — 24 October 2026

**A real bug: the third ambient blob ignored the Style setting.** `--blob-3` was
declared but never read, so changing the background mood left that one blob on
its old colour.

## 60 — 24 October 2026

**The volume now follows the phone.** `HTMLMediaElement.volume` is a separate
knob from the phone's media volume, and a WebView cannot read the system one, so
the two never matched. Inside the shell the shell owns it: moving the app's
slider sets the phone's media volume, and a hardware volume press comes back the
other way and moves the slider. In a browser nothing changes — the slider drives
the element, as before.

**The refresh rate now follows the system.** The app used to force the highest
refresh mode the panel supports, which ignores what the system is actually asking
for: when the system dropped to 60Hz the app kept pulling it back up and the two
disagreed. It now leaves the display alone and runs at whatever rate the system
has chosen, including 120Hz when it is set to that.

## 59 — 24 October 2026

**The stutter.** Two causes, both real.

The now-playing effect depended on `state.currentTime`, which changes on every
`timeupdate` — several times a second. That pushed the song across the bridge
that often, and the shell rebuilt and re-posted the media notification just as
often. The position now lives in a ref, so the push happens when the song or the
play state changes, which is all the card needs; it extrapolates the position
itself. The shell also skips the rebuild entirely when nothing the card shows has
changed.

The three drifting colour blobs each carried a `filter: blur(56px)` while
animating. Three screen-sized layers paying for a 56px blur every frame is one
of the most expensive things a phone GPU can be asked to do. A radial gradient is
already soft, so the blur is gone and the gradient stops carry the softness. The
glass lift shadow was also trimmed from a 46px to a 30px blur.

The progress bar also glided nowhere between timeupdates; it steps a few times a
second. It now eases between them.

## 58 — 24 October 2026

**The app now says which version it is.** The foot of the settings sheet shows
it, so it can be checked against what is on GitHub at a glance. It is stamped in
at build time from `package.json`, so it cannot drift.

**A changelog.** Every version, and what changed in it, in one file.

## 57 — 24 October 2026

**The player bar could still run off the right of the screen.**
The wrap that was meant to fix this sat behind a `max-width` media query, which
depends on the reported viewport width being what we expect — and it is not
always. Wrapping is now unconditional and the capsules never shrink, so if the
two do not fit side by side they take a line each at any width. Below 380px the
controls step down a size as well. Checked at 320, 360, 412, 480, 540 and 620.

**The app still drew underneath the clock.**
Padding the WebView directly does not reliably move the page: it renders into
its own bounds, so the padding did nothing. The WebView now sits inside a plain
holder, and the holder is what gets padded.

## 56 — 24 October 2026

**The player bar spilled out of the panel.**
The transport capsule and the volume capsule together need about 386px; inside
the panel of a 360px screen there is about 300px. The row was `nowrap` and the
panel does not clip, so both pushed out through its edge.

**The topbar ran out of room.** Style, settings and fullscreen became one
overflow menu.

**System bars.** The heights are handed to the layout rather than assumed.

## 55 — 24 October 2026

**The now-playing card.** Android has no Dynamic Island, so this uses what
Android has: a `MediaSession` and a media notification — the lock screen, the
notification shade, the quick-settings media player, and the control centre
Xiaomi, Realme and Honor build on top of it. The card's own buttons drive the
real player. The notification permission is asked the first time something
plays.

**Fixed a silent bug:** the shell keeps one object on `window.vinylNative`, and
the library-refresh hook was replacing it wholesale — which would have unhooked
the media buttons.

## 54 — 24 October 2026

**Edge to edge.** Android 15 forces every app to draw edge to edge. The insets
that come with it were never handled, so on a phone with a navigation bar the
player bar sat underneath it or left a band of bare window below the panel.

## 53 — 24 October 2026

**Make it look how you want.** A Style panel in settings: accent (eight presets,
any colour at all, or taken from the playing cover art), seven background colour
fields, a glass-strength slider, a corner-roundness slider, and six record tints.
All of it saved on the device.

## 52 — 24 October 2026

**The glitchy player bar.** The specular rim was a gradient border drawn with
`mask-composite: exclude`. Android WebView never implemented mask-composite
properly: where it is missing the mask is dropped and the pseudo-element paints
as a hard-edged bright rectangle across the whole panel. The rim now lives in
inset box-shadows, which follow `border-radius` everywhere and cannot fail.

## 51 — 24 October 2026

**Play-ready.** `targetSdk` and `compileSdk` 36 — Play refuses new apps below
this since 31 August 2026. Signed with a real upload key. `build-aab.sh`
assembles the App Bundle with bundletool, which Play requires for new apps. A
privacy policy page and the 1024×500 feature graphic.

## 50 — 24 October 2026

The version the channel launched with: Liquid Glass throughout, the staged
opening screen, the 120 Hz work, and the snappier motion.
