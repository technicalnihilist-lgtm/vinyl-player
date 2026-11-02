# Changelog

Every change to Vinyl Player is committed here, in the same breath as the change
itself. There is no separate release step to forget: if a fix is made, it is on
GitHub. The version number below is the one the app reports in
**Settings → More → About**, and the one stamped into the Android manifest.

---

## 102 — 2 November 2026

**Songs you added by hand no longer vanish when the app rescans the library.**

The Android shell rescans the phone's music every time the app comes back to the
foreground, and a rescan replaces the playlist with what it found. What it found
is only ever the phone's own music — so a folder of files you had added by hand
was wiped out of the list the next time you unlocked your phone and came back.
The imported tracks are kept now, appended after the device's, with nothing
duplicated and no track appearing twice.

The same guard covers the other direction: if a rescan comes back empty (the
permission was revoked, or the scan found nothing), the imported songs are still
there instead of the whole list — and whatever was playing — being cleared.

## 101 — 2 November 2026

**Dragging the progress bar no longer forces a layout on every move.**

The rail's box was measured inside the function that turns a finger position
into a time — so every `pointermove` called `getBoundingClientRect`, which is a
forced synchronous layout, and then set state, and then seeked the audio element.
A drag across the bar did that a hundred times, in the middle of the most
latency-sensitive gesture in the app.

The box is now measured once, when the drag starts, and again once when it ends.
The position is applied at most once a frame through `requestAnimationFrame`, so a
pointer that reports faster than the screen refreshes — a stylus, a 240 Hz touch
panel — no longer queues up seeks the audio element has to work through. Nothing
moves on screen any earlier than a frame could have shown it.

## 100 — 2 November 2026

**The playback tick no longer rebuilds the interface around it.**

The position lives in the player state, and it lands there several times a
second, so the whole app re-renders just as often. Everything in that re-render
that does not depend on the position was being rebuilt anyway: the settings
sheet — all six switches and the entire Style panel, 144 elements on its own —
the tab bar, the options bar and the ambient background, 183 elements in total,
four or more times a second, for a number that only the progress bar reads.

Those four are memoised components now, and the handlers they are given are
stable (`useCallback`) so the memo can actually take effect. The count above is
measured: the four components rendered to markup and their elements counted.

## 99 — 2 November 2026

**Reduced motion is respected from the first frame.**

The setting was read in an effect that ran after the first paint, so the app
started in its full-motion state and corrected itself a frame later. Anyone who
has told their phone to reduce motion got the launch animation, the drifting
glass and the record's spin for that frame — and paid for a re-render and a style
recalc to switch it all off again. The answer is now read synchronously, before
the first render, so nothing is animated unless it should be.

The change listener also falls back to `addListener` where `addEventListener` is
missing on a `MediaQueryList`, which is the case on the older WebViews the app
still supports — there the listener was silently never attached, so toggling the
system setting while the app was open did nothing.

## 98 — 2 November 2026

**The list is filtered in one pass.**

Building the visible rows went through every song twice: once to wrap it as
`{ track, index }`, once to throw most of those wrappers away. On a library of a
few thousand songs that is a few thousand short-lived objects per keystroke, all
of them straight into the young generation for the collector to sweep.

It is one loop now, allocating only for the rows that survive. Measured on a
5,000-track library over 1,000 filter calls: 0.680 ms per call becomes 0.528 ms
(1.29×), and the wrappers created per call fall from 5,000 to 1,602 — the number
that actually match. A test asserts the new function returns exactly what the old
one did, across the empty query, a title match, an artist match, the Liked tab
and both together.

## 97 — 2 November 2026

**Changing track no longer builds the whole play order to answer one step.**

`step()` — what "next", "previous" and the end of a track all go through — built
the play order first and then walked it. With shuffle off that order is the
library order, index for index, so the array was built only to be indexed once:
an array as long as the library, allocated and thrown away on every track change.

Measured on a 5,000-track library over 200,000 steps: 575 µs per step building
the order becomes 62 ns reading the index — 9,241× — and 39 KB of array per press
is no longer allocated at all. The shuffled path is untouched: with shuffle on
the order really is arbitrary, and it is still walked exactly as before.

A test walks every combination of library size, position, direction, repeat mode
and end-of-track against the old implementation, so the shortcut is proven to
return the same step in every case.

## 96 — 2 November 2026

**Opening the app no longer writes the settings it just read.**

Both stores ran their save effect the moment the app mounted — with the value
they had loaded a millisecond earlier. So every launch cost two disk writes (the
settings and the style) to store exactly what was already there, before the
listener had touched anything.

The first run is now skipped, and the debounce moved into one shared, tested
helper (`utils/persist.ts`) used by all three stores — settings, style and the
hearts. One place that decides when a write happens, instead of three copies of
the same timer.

## 95 — 2 November 2026

**The hearts are remembered.**

Liking a song was the one thing in the player that was purely the listener's own
opinion, and it was the one thing never saved: the heart filled in, the Liked tab
filled up, and closing the app threw all of it away. The likes now live in the
local store beside the settings and the style, under the same rules — only
`id: true` entries are written, and anything that is not a real like is ignored
when it is read back, so a half-written entry cannot un-like a song.

The write is debounced by a quarter of a second, so tapping through a dozen
hearts is one write rather than a dozen, and it does not write at all until
something has actually been changed.

## 94 — 2 November 2026

**The arrow keys move through the list you are looking at.**

The playlist steps by one through the library when you press up or down. With a
tab or a search filtering the list, "one more in the library" is a song that is
not on screen: three search results showing, down arrow pressed, and the
selection landed on a fourth track that was not one of them — the lens vanished
and the list scrolled to a row that was not there.

Stepping now happens through the rows actually visible, in display order, and
stops at either end rather than wrapping. If the playing track has been filtered
away, the first press lands on the nearest visible row in the direction you are
going, so the key always does something you can see.

The step itself is a pure function in `utils/playlist.ts` with its own tests.

## 93 — 2 November 2026

**A seek you did not finish no longer throws the song back to the start.**

Letting go of the progress bar publishes where the finger was. A gesture the
system takes away — an incoming call, a swipe in from the edge, the notification
shade coming down over the bar — arrives as `pointercancel` instead, and that
event carries no position at all: its `clientX` is 0. The bar treated it exactly
like a release, so it seeked to zero and the track audibly restarted. A cancelled
drag now ends where the finger last was.

The rail arithmetic also moved into `utils/timeline.ts`, a pure function with its
own tests: a pointer past either end clamps to that end, and a rail that has not
been laid out yet resolves to the start of the track rather than `NaN`.

## 74 — 25 October 2026

**The options live in one floating bar, and nowhere else.**

Modelled on the segmented control in the Liquid Glass prototype the design came
from: one translucent capsule holding its own items, with the rim and the lift on
the capsule rather than on each button. Three separate glass pills became one
surface with three plain buttons inside it — tidier, and one less thing to draw.

**The glass is flatter, and lighter because of it.**

The 26px white halo and the 30px lift are gone. What is left is one hairline, one
lit edge, one soft shadow, and the accent bleed at the base. That is closer to the
material in the reference — and a wide blur sitting behind every glass surface was
the most expensive thing on the screen, so removing it is a real saving rather
than a cosmetic one. The bundle came down with it, 197.5 KB to 196.6 KB.

## 73 — 25 October 2026

**Why the app felt heavy on open — found it.**

Every track's fallback cover was an SVG data URI with **two Gaussian blur filters
inside it, one at a 46px radius**. On a library of a few hundred songs that is a
few hundred blurred SVGs to rasterise before the list could settle. The same
picture is now a plain CSS gradient: no image, no data URI, no filter, nothing to
decode. A cover went from about a kilobyte of markup plus a blur pass to roughly
150 bytes of gradient.

**And the opening screen held for nearly six seconds.** It waits 2.4 now — the
animation is the same, you just get to your music sooner.

### Gen 5 glass

- **The bar is simple on purpose.** It is the thing you look at while listening,
  so it is one clean capsule: a hairline rim, one lit edge, and a shadow with no
  halo. Everything else can carry the heavier treatment.
- **The panels are not.** Three things changed: a brighter lit edge, a hairline
  that reads as a real bevel, and a faint **accent-tinted bleed at the base** —
  which is what makes the material look like it is picking up colour from behind
  it rather than sitting on top. That bleed follows whatever colour the Style
  panel is set to.
- A second, tighter highlight just inside the top edge: the light catching the
  thickness of the material rather than its surface.

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
uplaod key, so every release fell back to a throwaway debug key — **and a
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
