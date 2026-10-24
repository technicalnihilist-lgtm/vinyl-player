/** Format a number of seconds as MM:SS (or H:MM:SS for very long tracks).
 *  Guards against NaN / Infinity / negative values so the UI can never render
 *  "NaN:NaN" or a negative timestamp. */
export function formatTime(input: number): string {
  if (!Number.isFinite(input) || input < 0) return '0:00';
  const total = Math.floor(input);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    const mm = String(minutes).padStart(2, '0');
    return `${hours}:${mm}:${ss}`;
  }
  return `${minutes}:${ss}`;
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
