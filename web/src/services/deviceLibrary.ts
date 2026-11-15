import type { Track } from '../types';
import { coverGradient } from '../utils/artwork';

/**
 * Reads the music already on the user's device.
 *
 * The web layer cannot touch the phone's media library on its own, so the
 * Android shell exposes a small bridge (`window.AndroidBridge`) backed by
 * MediaStore. Audio and artwork are served back from our own origin
 * (`https://appassets.androidplatform.net/audio/<id>` and `/art/<id>`), which
 * keeps everything same-origin — no CORS, and the analyser still works.
 *
 * When the bridge is absent (i.e. running as a web page) everything here is
 * simply inert and the listener adds their own files instead.
 */

export type LibraryPermission = 'granted' | 'denied' | 'unknown';

export const NATIVE_ORIGIN = 'https://appassets.androidplatform.net';

export interface NativeBridge {
  getLibrary(): string;
  requestPermission(): void;
  openAppSettings(): void;
  refresh(): void;
}

interface NativePayload {
  permission?: LibraryPermission;
  tracks?: unknown;
}

const PALETTES: [string, string, string][] = [
  ['#7b2ff7', '#f107a3', '#ffd166'],
  ['#00c6ff', '#0072ff', '#a8ff78'],
  ['#f7971e', '#ffd200', '#ff5f6d'],
  ['#12c2e9', '#c471ed', '#f64f59'],
  ['#43cea2', '#185a9d', '#e0f7fa'],
  ['#8e2de2', '#4a00e0', '#c4b5fd'],
  ['#fc466b', '#3f5efb', '#fddb92'],
  ['#f953c6', '#b91d73', '#ffd6e0'],
];

function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * The same hash, over two strings, without building the string they would be
 * joined into.
 *
 * A track's palette comes from `hashOf(title + artist)`. On a library of three
 * thousand songs that is three thousand concatenated strings allocated during the
 * scan — every one of them immediately garbage — to arrive at a number that is
 * just the character codes of the two strings one after the other, which is
 * exactly what this walks. The palette a song is given does not change.
 */
function hashOfPair(a: string, b: string): number {
  let h = 0;
  for (let i = 0; i < a.length; i++) h = (h * 31 + a.charCodeAt(i)) | 0;
  for (let i = 0; i < b.length; i++) h = (h * 31 + b.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const idStr = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/**
 * Whether a track already made answers `hasArt` the same way.
 *
 * The claim is not stored on the track — it is baked into the getter — so it is
 * read back off the answer: a track that has art answers its `artwork` with the
 * art URL, and one that has not answers it with the procedural cover, which is the
 * same string as its fallback.
 */
function samePicture(track: Track, id: string, hasArt: boolean): boolean {
  return hasArt
    ? track.artwork === `${NATIVE_ORIGIN}/art/${encodeURIComponent(id)}`
    : track.artwork === track.fallbackArt;
}

/**
 * Turn the native payload into our Track shape. Pure, so it is unit-tested
 * against a captured payload without needing a device.
 *
 * Given the tracks of the previous scan, a song whose fields are all unchanged is
 * handed back as the very same object.
 *
 * The shell rescans the library every time the app comes back to the foreground,
 * and the page maps the whole payload again — a new `Track` for every song, with
 * new getters over new closures. `TrackRow` is memoised on its props, and `track`
 * is one of them, so a rescan that found one new song re-rendered every row in the
 * library: thousands of rows rebuilt, thousands of `formatTime` calls, thousands of
 * elements reconciled, to draw the same songs. Reusing the objects the rows already
 * hold is what lets React skip all of them and render the one row that changed.
 *
 * The covers come for free with it: the strings a track's getters have already
 * worked out live in that object's closure, so they survive the rescan too.
 */
export function mapDeviceTracks(raw: unknown, previous?: Map<string, Track>): Track[] {
  const payload = raw as NativePayload | null;
  const list = payload?.tracks;
  if (!Array.isArray(list)) return [];

  const out: Track[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    const o = item as Record<string, unknown>;
    const id = idStr(o.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const title = str(o.title).trim() || 'Unknown track';
    const artist = str(o.artist).trim() || 'Unknown artist';
    const album = str(o.album).trim();
    const palette = PALETTES[hashOfPair(title, artist) % PALETTES.length];
    const hasArt = o.hasArt !== false;

    /*
     * Both covers are worked out when they are first read, not when the track is
     * made.
     *
     * The procedural cover is about three hundred characters of CSS, built from
     * a hash and five multiplications; the artwork URL is a concat and an
     * encodeURIComponent. Doing that for every song in the phone's library meant a
     * few thousand strings — a megabyte and a half of them on a large library —
     * built before the first row could be drawn, for covers only the dozen rows on
     * screen ever read. Nothing else changes: each is built once, the first time
     * something asks for it, and the same string is answered afterwards.
     */
    const trackId = `device-${id}`;
    const src = `${NATIVE_ORIGIN}/audio/${encodeURIComponent(id)}`;
    const duration = num(o.duration);

    // Every field the row draws, and every field the getters close over. A song
    // whose own file has not changed is the song the list is already showing.
    const kept = previous?.get(trackId);
    if (
      kept &&
      kept.title === title &&
      kept.artist === artist &&
      kept.album === album &&
      kept.src === src &&
      kept.duration === duration &&
      kept.palette === palette &&
      samePicture(kept, id, hasArt)
    ) {
      out.push(kept);
      continue;
    }

    let coverArt: string | null = null;
    let deviceArt: string | null = null;
    const cover = () => (coverArt ??= coverGradient(palette, (hashOf(id) % 900) + 50));
    const art = () => (deviceArt ??= `${NATIVE_ORIGIN}/art/${encodeURIComponent(id)}`);

    out.push({
      id: trackId,
      title,
      artist,
      album,
      src,
      duration,
      palette,
      get artwork(): string {
        return hasArt ? art() : cover();
      },
      // Always have procedural art to fall back on if the file has no picture.
      get fallbackArt(): string {
        return cover();
      },
      source: 'device',
    });
  }
  return out;
}

export function deviceBridge(): NativeBridge | null {
  if (typeof window === 'undefined') return null;
  const b = (window as unknown as { AndroidBridge?: NativeBridge }).AndroidBridge;
  return b && typeof b.getLibrary === 'function' ? b : null;
}

export function hasDeviceLibrary(): boolean {
  return deviceBridge() !== null;
}

export interface DeviceLibrarySnapshot {
  tracks: Track[];
  permission: LibraryPermission;
  /** True while the native side is still scanning. */
  scanning: boolean;
}

const EMPTY_SNAPSHOT: DeviceLibrarySnapshot = { tracks: [], permission: 'unknown', scanning: false };

/** The last payload the shell handed over, and what we made of it. */
let lastRaw: string | null = null;
let lastSnapshot: DeviceLibrarySnapshot = EMPTY_SNAPSHOT;
/** The tracks of the last snapshot by id, so a rescan can hand the same objects back. */
let lastTracksById = new Map<string, Track>();

export function readDeviceLibrary(): DeviceLibrarySnapshot {
  const bridge = deviceBridge();
  if (!bridge) return EMPTY_SNAPSHOT;
  try {
    const raw = bridge.getLibrary();
    // The shell hands the whole library over as one JSON string, and it rescans
    // every time the app comes back to the foreground. Parsing and mapping a few
    // hundred tracks to arrive at exactly the same list is pure work, so an
    // unchanged payload returns the previous snapshot — including the very same
    // track array, which is what lets the player skip the update altogether.
    if (raw === lastRaw) return lastSnapshot;
    const payload = JSON.parse(raw) as NativePayload & { scanning?: boolean };
    // A rescan that found one new song used to replace every track object, and
    // every row in the list is memoised on the track it was given — so one new
    // song re-rendered the whole library. The songs that did not change come back
    // as the objects they already were.
    const tracks = mapDeviceTracks(payload, lastTracksById);
    lastTracksById = new Map(tracks.map((track) => [track.id, track]));
    lastRaw = raw;
    lastSnapshot = {
      tracks,
      permission: (payload?.permission as LibraryPermission) ?? 'unknown',
      scanning: Boolean(payload?.scanning),
    };
    return lastSnapshot;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

export function requestLibraryPermission(): void {
  deviceBridge()?.requestPermission();
}

export function openAppSettings(): void {
  deviceBridge()?.openAppSettings();
}

/**
 * Register the callback the native side calls after a scan or a permission
 * change. Returns a cleanup function.
 */
export function onDeviceLibraryChanged(handler: () => void): () => void {
  if (!hasDeviceLibrary()) return () => undefined;
  // The shell keeps one object on window.vinylNative. Merge into it rather than
  // replacing it — replacing would drop the media-button handler the now-playing
  // card registers, and the two features would take turns working.
  const w = window as unknown as { vinylNative?: Record<string, unknown> };
  w.vinylNative = { ...(w.vinylNative ?? {}), refresh: handler };
  return () => {
    if (w.vinylNative && w.vinylNative.refresh === handler) {
      delete w.vinylNative.refresh;
    }
  };
}
