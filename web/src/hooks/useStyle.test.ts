import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, isDefaultStyle, type Style } from './useStyle';

describe('isDefaultStyle()', () => {
  it('is true for the defaults', () => {
    expect(isDefaultStyle(DEFAULT_STYLE)).toBe(true);
    expect(isDefaultStyle({ ...DEFAULT_STYLE })).toBe(true);
  });

  it('is false when any single field has been changed', () => {
    const changed: Partial<Style>[] = [
      { accent: '#10b981' },
      { accentFromArt: !DEFAULT_STYLE.accentFromArt },
      { mood: 'ocean' },
      { disc: 'silver' },
      { glass: DEFAULT_STYLE.glass - 2 },
      { roundness: DEFAULT_STYLE.roundness - 1 },
      // Depth was the one the panel forgot about: moving it alone left Reset
      // disabled, as though nothing had changed.
      { depth: 0 },
      { depth: 100 },
    ];
    for (const over of changed) {
      expect(isDefaultStyle({ ...DEFAULT_STYLE, ...over })).toBe(false);
    }
  });
});
