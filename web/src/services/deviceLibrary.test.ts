import { describe, expect, it } from 'vitest';
import { mapDeviceTracks } from './deviceLibrary';

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

  it('falls back to generated art when a file has no picture', () => {
    const t = mapDeviceTracks(PAYLOAD)[1];
    expect(t.artwork.startsWith('data:image/svg+xml')).toBe(true);
    expect(t.fallbackArt?.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('always keeps a procedural fallback, even when real art exists', () => {
    const t = mapDeviceTracks(PAYLOAD)[0];
    expect(t.artwork).toContain('/art/41');
    expect(t.fallbackArt?.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('never shows blank titles or artists', () => {
    const t = mapDeviceTracks(PAYLOAD)[2];
    expect(t.title).toBe('Unknown track');
    expect(t.artist).toBe('Unknown artist');
    expect(t.duration).toBe(0);
  });

  it('survives a malformed payload', () => {
    expect(mapDeviceTracks(null)).toEqual([]);
    expect(mapDeviceTracks({})).toEqual([]);
    expect(mapDeviceTracks({ tracks: 'nope' })).toEqual([]);
  });
});
