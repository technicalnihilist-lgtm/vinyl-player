import { describe, expect, it } from 'vitest';
import type { Track } from '../types';
import { mergeLibrary } from './library';

const mk = (id: string, source?: 'device' | 'import'): Track => ({
  id,
  title: id,
  artist: 'A',
  album: 'B',
  src: `${id}.mp3`,
  duration: 10,
  artwork: '',
  palette: ['#000', '#111', '#222'],
  source,
});

const DEVICE = [mk('device-1', 'device'), mk('device-2', 'device')];
const IMPORTS = [mk('import-1', 'import'), mk('import-2', 'import')];

describe('mergeLibrary()', () => {
  it('keeps the songs the listener added by hand', () => {
    expect(mergeLibrary(DEVICE, [...DEVICE, ...IMPORTS]).map((t) => t.id)).toEqual([
      'device-1',
      'device-2',
      'import-1',
      'import-2',
    ]);
  });

  it('returns the device list untouched when there is nothing imported', () => {
    const out = mergeLibrary(DEVICE, DEVICE);
    expect(out).toBe(DEVICE);
  });

  it('never duplicates a track', () => {
    const out = mergeLibrary(DEVICE, [mk('device-1', 'device'), mk('import-1', 'import')]);
    expect(out.filter((t) => t.id === 'device-1')).toHaveLength(1);
    expect(out.map((t) => t.id)).toEqual(['device-1', 'device-2', 'import-1']);
  });

  it('survives a rescan that finds nothing at all', () => {
    // Permission revoked, or a scan that came back empty: the imported songs are
    // still the listener's, and must not vanish with the device's.
    expect(mergeLibrary([], IMPORTS).map((t) => t.id)).toEqual(['import-1', 'import-2']);
  });
});
