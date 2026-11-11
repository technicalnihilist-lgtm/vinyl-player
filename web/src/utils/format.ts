/**
 * The times already formatted, keyed by whole second.
 *
 * `formatTime` is on the hottest render path there is: every row of the playlist
 * draws the length of its song, the seek bar draws two more, and both are redrawn
 * whenever the list does. Most of those calls ask for a time that has been asked
 * for before — a library of a few thousand songs has far fewer distinct lengths
 * than it has songs, and a song that has not loaded yet is `0`, over and over —
 * and each one used to build the string again from scratch: two `Math.floor`s, a
 * `String`, a `padStart` and a template literal, twice per row per render.
 *
 * Keyed by the whole second, which is what is drawn, so 254.43 and 254.9 share
 * the entry their answer comes from. Bounded, because a player left running for a
 * very long time has no business growing a map of every second it has shown: it
 * is emptied when it fills, which costs one rebuild of the entries in use.
 */
const FORMATTED_LIMIT = 512;
const formatted = new Map<number, string>();

/** Format a number of seconds as MM:SS (or H:MM:SS for very long tracks).
 *  Guards against NaN / Infinity / negative values so the UI can never render
 *  "NaN:NaN" or a negative timestamp. */
export function formatTime(input: number): string {
  if (!Number.isFinite(input) || input < 0) return '0:00';
  const total = Math.floor(input);
  const cached = formatted.get(total);
  if (cached !== undefined) return cached;

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, '0');
  let text: string;
  if (hours > 0) {
    const mm = String(minutes).padStart(2, '0');
    text = `${hours}:${mm}:${ss}`;
  } else {
    text = `${minutes}:${ss}`;
  }

  if (formatted.size >= FORMATTED_LIMIT) formatted.clear();
  formatted.set(total, text);
  return text;
}

/** Clamp a playback position into [0, duration] and reject non-finite input. */
export function clampTime(time: number, duration: number): number {
  if (!Number.isFinite(time)) return 0;
  const upper = Number.isFinite(duration) && duration > 0 ? duration : Number.MAX_SAFE_INTEGER;
  return Math.min(Math.max(time, 0), upper);
}

/** Safe percentage 0..100 for progress bars. */
export function progressPercent(current: number, duration: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(100, Math.max(0, (current / duration) * 100));
}
