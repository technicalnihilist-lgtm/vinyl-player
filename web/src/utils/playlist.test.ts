import { describe, expect, it } from 'vitest';
import { stepVisible } from './playlist';

// A library of six songs, of which rows 0, 2 and 5 are showing.
const FILTERED = [0, 2, 5];

describe('stepVisible()', () => {
  it('steps to the next visible row, skipping hidden ones', () => {
    expect(stepVisible(FILTERED, 0, 1)).toBe(2);
    expect(stepVisible(FILTERED, 2, 1)).toBe(5);
  });

  it('steps back the same way', () => {
    expect(stepVisible(FILTERED, 5, -1)).toBe(2);
    expect(stepVisible(FILTERED, 2, -1)).toBe(0);
  });

  it('stops at either end instead of wrapping', () => {
    expect(stepVisible(FILTERED, 5, 1)).toBeNull();
    expect(stepVisible(FILTERED, 0, -1)).toBeNull();
  });

  it('lands on a visible row when the current track is filtered out', () => {
    // Track 3 is playing but hidden; down finds the next visible row after it,
    // up finds the last one before it.
    expect(stepVisible(FILTERED, 3, 1)).toBe(5);
    expect(stepVisible(FILTERED, 3, -1)).toBe(2);
  });

  it('has nowhere to go when nothing matches the search', () => {
    expect(stepVisible([], 1, 1)).toBeNull();
    expect(stepVisible([], 1, -1)).toBeNull();
  });

  it('with everything visible it is a plain one-step move', () => {
    const all = [0, 1, 2, 3];
    expect(stepVisible(all, 1, 1)).toBe(2);
    expect(stepVisible(all, 1, -1)).toBe(0);
    expect(stepVisible(all, 3, 1)).toBeNull();
  });
});
