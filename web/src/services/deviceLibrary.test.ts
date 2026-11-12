import { describe, expect, it } from 'vitest';
import { mapDeviceTracks } from './deviceLibrary';

// The eight palettes a device track can be given, in the order they are tried.
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
const PALETTE_OF = (hash: number) => PALETTES[hash % PALETTES.length];

// Shaped exactly like the JSON the Android MediaStore bridge returns.
const PAYLOAD = {
  permission: 'granted',
  tracks: [
    { id: '41', title: 'Tum Hi Ho', artist: 'Arijit Singh', album: 'Aashiqui 2', duration: 262.4, hasArt: true },
    { id: 42, title: 'Kesariya', artist: 'Arijit Singh', album: 'Brahmastra', duration: 268, hasArt: false },
    { id: '41', title: 'Duplicate id', artist: 'X', album: '', duration: 10, hasArt: true },
    { id: '43', title: '   ', artist: '', album: '', duration: 0, hasArt: true },
    { title: 'No id at all', artist: 'Y', duration: 5 },
  ],
};

describe('mapDeviceTracks', () => {
  it('maps real device rows into tracks', () => {
    const tracks = mapDeviceTracks(PAYLOAD);
    expect(tracks).toHaveLength(3); // duplicate id + missing id dropped
    expect(tracks[0]).toMatchObject({
      id: 'device-41',
      title: 'Tum Hi Ho',
      artist: 'Arijit Singh',
      album: 'Aashiqui 2',
      duration: 262.4,
      source: 'device',
    });
  });

  it('serves audio and art from our own origin', () => {
    const tracks = mapDeviceTracks(PAYLOAD);
    expect(tracks[0].src).toBe('https://appassets.androidplatform.net/audio/41');
    expect(tracks[0].artwork).toBe('https://appassets.androidplatform.net/art/41');
  });

  it('accepts numeric ids from the bridge', () => {
    expect(mapDeviceTracks(PAYLOAD)[1].id).toBe('device-42');
  });

  it('falls back to a generated cover when a file has no picture', () => {
    const t = mapDeviceTracks(PAYLOAD)[1];
    // A CSS gradient, not an image: see utils/artwork.ts for why.
    expect(t.artwork).toContain('radial-gradient');
    expect(t.fallbackArt).toContain('radial-gradient');
    expect(t.artwork).not.toContain('data:');
  });

  it('always keeps a procedural fallback, even when real art exists', () => {
    const t = mapDeviceTracks(PAYLOAD)[0];
    expect(t.artwork).toContain('/art/41');
    expect(t.fallbackArt).toContain('radial-gradient');
    // and it is a gradient, so there is no image to decode
    expect(t.fallbackArt).not.toContain('data:');
  });

  it('builds a cover when it is first read, and answers the same one after', () => {
    const t = mapDeviceTracks(PAYLOAD)[0];
    // Worked out on first read rather than for every song in the library: the
    // property is an accessor, so nothing was built when the track was made.
    const descriptor = Object.getOwnPropertyDescriptor(t, 'fallbackArt');
    expect(typeof descriptor?.get).toBe('function');
    const first = t.fallbackArt;
    expect(first).toContain('radial-gradient');
    expect(t.fallbackArt).toBe(first);
    expect(t.artwork).toBe('https://appassets.androidplatform.net/art/41');
  });

  it('never shows blank titles or artists', () => {
    const t = mapDeviceTracks(PAYLOAD)[2];
    expect(t.title).toBe('Unknown track');
    expect(t.artist).toBe('Unknown artist');
    expect(t.duration).toBe(0);
  });

  it('gives a song the same palette it was given before the hash changed', () => {
    // The palette used to come from `hashOf(title + artist)`. Hashing the two
    // strings in turn is the same walk over the same character codes, so every
    // song in every existing library keeps the cover it has always had.
    const legacy = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      return Math.abs(h);
    };
    const tracks = mapDeviceTracks(PAYLOAD);
    expect(tracks[0].palette).toEqual(PALETTE_OF(legacy('Tum Hi Ho' + 'Arijit Singh')));
    expect(tracks[1].palette).toEqual(PALETTE_OF(legacy('Kesariya' + 'Arijit Singh')));
    expect(tracks[2].palette).toEqual(PALETTE_OF(legacy('Unknown track' + 'Unknown artist')));
  });

  it('survives a malformed payload', () => {
    expect(mapDeviceTracks(null)).toEqual([]);
    expect(mapDeviceTracks({})).toEqual([]);
    expect(mapDeviceTracks({ tracks: 'nope' })).toEqual([]);
  });
});
