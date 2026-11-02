import { describe, expect, it } from 'vitest';
import { seekTarget } from './timeline';

// A 300px rail starting at x=50, playing a 120s track.
const at = (clientX: number) => seekTarget(clientX, 50, 300, 120);

describe('seekTarget()', () => {
  it('maps the middle of the rail to the middle of the track', () => {
    expect(at(200)).toBe(60);
  });

  it('maps the two ends exactly', () => {
    expect(at(50)).toBe(0);
    expect(at(350)).toBe(120);
  });

  it('clamps a pointer dragged past either end', () => {
    expect(at(-400)).toBe(0);
    expect(at(9000)).toBe(120);
  });

  it('resolves a cancelled pointer (clientX 0) to the start, not to a negative time', () => {
    // This is the shape of a `pointercancel`: the event carries clientX 0. The
    // component must not use it as a seek position, but the maths still has to
    // be well-defined if it ever does.
    expect(at(0)).toBe(0);
    expect(Number.isFinite(at(0))).toBe(true);
  });

  it('is well-defined before the rail has been laid out', () => {
    expect(seekTarget(120, 0, 0, 120)).toBe(0);
    expect(seekTarget(120, 0, 300, 0)).toBe(0);
    expect(seekTarget(Number.NaN, 0, 300, 120)).toBe(0);
    expect(seekTarget(120, 0, 300, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
