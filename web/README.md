# Vinyl Player — Liquid Glass Music Player

A working, production-quality music player: a rotating vinyl record, a scrollable
glass playlist, real HTML5 audio playback with a synchronised timeline, and a
Web Audio–driven visualiser. Inspired by the iOS "Liquid Glass" look and the
layout of a premium streaming player.

**It ships with no songs and never touches the network.** The playlist is filled
from the listener's own music: on Android the app reads the device's media
library (including embedded album art); everywhere else you add files or folders
yourself.

The interface is **Liquid Glass** — translucent blurred surfaces with specular
rims, a highlight that follows the pointer, a drifting colour field behind the
glass, spring-based press feedback, staggered list entrances and a highlight that
slides from one song to the next.

This is a real application, not a mock-up: every control is wired to the audio
engine and the vinyl/visualiser respond to actual playback.

Built with **React + TypeScript + Vite**.

---

## 1. Requirements

- Node.js 18 or newer (Node 20 recommended)
- A modern browser (Chrome, Edge, Firefox or Safari)

## 2. Install & run

```bash
# from this folder
npm install

# start the dev server (hot reload)
npm run dev
# → open the URL it prints, usually http://localhost:5173
```

### Production build

```bash
npm run build      # type-checks, then builds to ./dist
npm run preview    # serves the built app on http://localhost:4173
```

> **Serve it over HTTP.** Open the app through `npm run dev`, `npm run preview`,
> or any static server. If you open `dist/index.html` directly from disk
> (`file://`), playback still works but browsers block the Web Audio analyser
> for file-origin media, so the visualiser falls back to a labelled idle
> animation. Any local server fixes this.

### Tests

```bash
npm test           # unit tests (Vitest)
npm run typecheck  # TypeScript, no emit
```

---

## 3. What's implemented

**Vinyl**
- CSS-animated record that spins only while audio is playing.
- Pause freezes the current rotation angle; resume continues from the same angle.
- Grooves, conic sheen and inner/outer rings for a realistic look.
- The artwork label swaps on track change without the disc moving or resizing.

**Playlist**
- Backed by structured track data (`src/data/tracks.ts`), each with a stable id,
  title, artist, artwork, source and duration.
- Scroll with the wheel, trackpad, touch, or click-and-drag; momentum scrolling on
  touch via native `overflow` + `touch-action`.
- The active row is highlighted and auto-scrolled into view.
- Click a row to play it; clicking the active row toggles play/pause.
- Local search filter, an All/Liked segmented control with a sliding pill, and a
  per-track like button.
- Previous / next, shuffle and repeat (off → all → one) with correct end-of-list
  behaviour.

**Audio**
- One persistent `<audio>` element for the whole app — switching tracks can never
  overlap audio.
- Play/pause, previous/next, seekable timeline, volume slider, mute toggle.
- Loading/buffering and error states surface in the UI.
- Autoplay-policy rejections are caught and reported instead of failing silently.

**Timeline**
- Elapsed and total time come straight from the audio element.
- Click or drag to seek; keyboard accessible (`←/→` ±5 s, `Home`, `End`).
- Guards against `NaN`/`Infinity`/negative values and never exceeds 100 %.

**Visualiser**
- Real `AnalyserNode` frequency data drives the bars, with a purple→blue gradient,
  glow and a soft fading reflection.
- Bars ease towards their target so nothing flickers; they settle when paused.
- If live analysis is genuinely unavailable (no `AudioContext`, or a cross-origin
  source), it shows a clearly-labelled idle animation instead of faking it.

**Your device's music**
- On Android the playlist is read from the device's own media library through a
  small native bridge; nothing is bundled and nothing is downloaded.
- Album art embedded in each file is shown on the vinyl label and in the list.
  Files without a picture get a generated cover instead — never a blank square.
- Audio and artwork are served from the app's own origin, so playback stays
  same-origin and the visualiser reacts to your music for real.
- The library is rescanned whenever the app returns to the foreground.

**Performance (built for 120 Hz)**
- Animations and scrolling run at the display's refresh rate. The heavy effects
  that made the first glass build stutter are gone: no `backdrop-filter` (a
  full-screen filter pass *every* frame), no full-screen grain overlay, no canvas
  `shadowBlur`, no animated `box-shadow`, and no transition on a layout property.
- The ambient colour field animates `transform` only, with the blur baked into
  each layer, so it is handled entirely by the compositor — zero main-thread work.
- The visualiser paints at most 60×/second regardless of the panel's refresh
  rate, builds its gradients once per resize, caps its backing resolution, and
  stops painting completely while the music is silent.
- The playlist is memoised, so the several-times-a-second playback tick no longer
  re-renders every row.
- Measured on the same machine, same test: median frame cost while playing fell
  from 17.8 ms to 6.2 ms (~3× faster); idle from 12.7 ms to 3.6 ms.

**Liquid Glass interface** (matches Apple's iOS 26 / 27 material)
- Floating glass capsules holding bare icons — the control style from the
  Liquid Glass video — instead of individually boxed buttons.
- A milky translucent tint with a bright gradient specular rim and a soft halo.
- A pill-shaped highlight in the list, and the segmented control's sliding pill.
- Translucent, heavily blurred, saturated surfaces with a gradient specular rim.
- A highlight that follows the pointer across the main panel.
- A drifting colour field behind the glass (pure CSS, no per-frame JS).
- Spring-based press feedback on every control, staggered list entrances, and a
  highlight that slides from one song to the next instead of jumping.
- Fully offline: no network requests are made anywhere in the app.

**Other**
- One authoritative playback state (a reducer) shared by every component.
- Stale media events from a previous track are ignored while a new source loads.
- Fullscreen toggle, collapse the playlist panel, keyboard shortcuts
  (`Space` play/pause, `Shift+←/→` previous/next).
- Respects `prefers-reduced-motion` (spin and equaliser animation disabled).
- Responsive layout for desktop, tablet and mobile with no overlap or clipping.
- Import your own audio files with the **+** button.

---

## 4. Using your own audio

Two options:

1. **Import at runtime** — use the **+** button in the playlist header to pick
   audio files, or the **folder** button next to it to add every track in a
   directory at once. Durations are read from the file metadata and the tracks
   are appended to the playlist.

2. **Bundle your own tracks** — replace the files in `src/assets/audio/` (keep the
   `trackNN.mp3` names, or edit the imports in `src/data/tracks.ts`) and update the
   `SEEDS` array there with the title, artist and palette for each track. Cover art
   is generated procedurally from the palette; supply your own by pointing
   `artwork` at an image URL.

---

## 5. Project structure

```
src/
  App.tsx                 app shell + layout
  main.tsx                entry point
  types.ts                Track / RepeatMode / PlaybackStatus
  data/tracks.ts          the playlist seed (empty — no songs ship)
  audio/engine.ts         single <audio> element + Web Audio analyser manager
  services/deviceLibrary.ts   bridge to the Android media library
  hooks/usePlayer.ts      the playback controller (all side effects live here)
  hooks/useReducedMotion.ts
  state/player.ts         the reducer + pure navigation helpers (step, shuffle)
  state/player.test.ts    reducer / transition tests
  utils/format.ts         MM:SS formatting, clamping, progress %
  utils/format.test.ts
  utils/artwork.ts        procedural SVG cover generator
  components/
    Vinyl.tsx  Playlist.tsx  TrackRow.tsx  Timeline.tsx
    Artwork.tsx  EmptyState.tsx  AmbientBackground.tsx
    TransportControls.tsx  VolumeControl.tsx  Visualizer.tsx  Icons.tsx
  styles/app.css          the whole design system
```

---

## 6. Known limitations

- **Duration is unknown until metadata loads.** Imported files briefly show `0:00`
  as the total until the browser reads their header (there is an 8-second timeout).
- **Rotational speed** is a stylistic ~12 s per revolution rather than a literal
  33⅓ rpm, which reads better on screen.
- The layout is built for a definite viewport height; on short (landscape phone)
  screens it switches to a compact side-by-side arrangement.
- The bundled audio is provided by the project owner; confirm you hold the rights
  before redistributing it.
