import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, isDefaultStyle, parseStyle, styleVars, type Style } from './useStyle';

describe('parseStyle()', () => {
  it('reads back what was stored', () => {
    const stored: Style = { ...DEFAULT_STYLE, mood: 'ocean', disc: 'silver', glass: 40, roundness: 12, depth: 0 };
    expect(parseStyle(JSON.stringify(stored))).toEqual(stored);
  });

  it('falls back to the defaults for anything that is not a stored style', () => {
    for (const raw of [null, undefined, '', 'not json', '[]', 'null', '42']) {
      expect(parseStyle(raw)).toEqual(DEFAULT_STYLE);
    }
  });

  it('keeps the fields it understands and drops the rest', () => {
    const parsed = parseStyle(JSON.stringify({ mood: 'forest', glass: 'lots', roundness: 900, accent: 'red' }));
    expect(parsed.mood).toBe('forest');
    expect(parsed.glass).toBe(DEFAULT_STYLE.glass);
    expect(parsed.roundness).toBe(34);
    expect(parsed.accent).toBe(DEFAULT_STYLE.accent);
  });

  it('refuses a mood or a disc it only inherits from Object', () => {
    // `'constructor' in MOODS` is true, so this used to be accepted — and
    // `MOODS['constructor']` is a function, whose `.a`/`.b`/`.c` are all
    // undefined, so the whole background of the app went unstyled.
    for (const key of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      const parsed = parseStyle(JSON.stringify({ mood: key, disc: key }));
      expect(parsed.mood).toBe(DEFAULT_STYLE.mood);
      expect(parsed.disc).toBe(DEFAULT_STYLE.disc);
      // ...and the theme it produces is a real one.
      const vars = styleVars(parsed) as Record<string, string>;
      expect(vars['--bg-a']).toBeTruthy();
      expect(vars['--disc-a']).toBeTruthy();
    }
  });
});

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
