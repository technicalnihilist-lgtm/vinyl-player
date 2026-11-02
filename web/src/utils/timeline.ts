import { clampTime } from './format';

/**
 * Where a pointer at `clientX` lands on the seek rail.
 *
 * Pure so the drag arithmetic is unit-tested rather than trusted. The rail's own
 * rectangle is passed in rather than measured here: the caller has it already,
 * and a measuring call inside the maths would hide a forced layout in a function
 * that looks free.
 *
 * Everything is clamped: a finger dragged past either end of the rail seeks to
 * that end, never off it, and a rail that has not been laid out yet (zero width,
 * no duration) resolves to the start of the track instead of `NaN`.
 */
export function seekTarget(
  clientX: number,
  railLeft: number,
  railWidth: number,
  duration: number,
): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  if (!Number.isFinite(railWidth) || railWidth <= 0) return 0;
  if (!Number.isFinite(clientX) || !Number.isFinite(railLeft)) return 0;
  const ratio = (clientX - railLeft) / railWidth;
  const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
  return clampTime(clamped * duration, duration);
}
