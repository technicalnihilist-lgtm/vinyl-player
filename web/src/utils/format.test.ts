import { describe, expect, it } from 'vitest';
import { clampTime, formatTime, progressPercent } from './format';

describe('formatTime', () => {
  it('formats ordinary durations', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9)).toBe('0:09');
    expect(formatTime(75)).toBe('1:15');
    expect(formatTime(254.43)).toBe('4:14');
  });
  it('supports long durations', () => {
    expect(formatTime(3725)).toBe('1:02:05');
  });
  it('never renders NaN, Infinity or negatives', () => {
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
    expect(formatTime(-5)).toBe('0:00');
  });
});

describe('clampTime / progressPercent', () => {
  it('clamps into range and rejects non-finite input', () => {
    expect(clampTime(500, 100)).toBe(100);
    expect(clampTime(-3, 100)).toBe(0);
    expect(clampTime(NaN, 100)).toBe(0);
  });
  it('never exceeds 100%', () => {
    expect(progressPercent(50, 100)).toBe(50);
    expect(progressPercent(200, 100)).toBe(100);
    expect(progressPercent(1, 0)).toBe(0);
    expect(progressPercent(NaN, 100)).toBe(0);
  });
});
