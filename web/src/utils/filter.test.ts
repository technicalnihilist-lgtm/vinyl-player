import { describe, expect, it } from 'vitest';
import type { Track } from '../types';
import { filterTracks } from './filter';

const mk = (id: string, title: string, artist: string): Track => ({
  id,
  title,
  artist,
  album: 'Album',
  src: `${id}.mp3`,
  duration: 100,
  artwork: '',
  palette: ['#000', '#111', '#222'],
});

const LIB = [
  mk('a', 'Kesariya', 'Arijit Singh'),
  mk('b', 'Tum Hi Ho', 'Arijit Singh'),
  mk('c', 'Shape of You', 'Ed Sheeran'),
];

const ids = (rows: { track: Track }[]) => rows.map((r) => r.track.id);

describe('filterTracks()', () => {
  it('shows the whole library with no query and no filter', () => {
    expect(ids(filterTracks(LIB, '', 'all', {}))).toEqual(['a', 'b', 'c']);
  });

  it('keeps each track’s index in the library, not in the result', () => {
    expect(filterTracks(LIB, 'shape', 'all', {}).map((r) => r.index)).toEqual([2]);
  });

  it('matches titles and artists, case-insensitively', () => {
    expect(ids(filterTracks(LIB, 'ARIJIT', 'all', {}))).toEqual(['a', 'b']);
    expect(ids(filterTracks(LIB, '  kesar  ', 'all', {}))).toEqual(['a']);
  });

  it('matches nothing when nothing matches', () => {
    expect(filterTracks(LIB, 'zzz', 'all', {})).toEqual([]);
  });

  it('shows only the liked songs on the Liked tab', () => {
    expect(ids(filterTracks(LIB, '', 'liked', { b: true }))).toEqual(['b']);
    expect(ids(filterTracks(LIB, '', 'liked', { a: true, c: true }))).toEqual(['a', 'c']);
  });

  it('combines the tab and the search', () => {
    expect(ids(filterTracks(LIB, 'arijit', 'liked', { a: true, b: true }))).toEqual(['a', 'b']);
    expect(ids(filterTracks(LIB, 'shape', 'liked', { a: true }))).toEqual([]);
  });

  it('agrees with the map-then-filter version it replaced', () => {
    const old = (tracks: Track[], query: string, filter: 'all' | 'liked', likes: Record<string, boolean>) => {
      const q = query.trim().toLowerCase();
      return tracks
        .map((track, index) => ({ track, index }))
        .filter(
          ({ track }) =>
            (filter === 'all' || likes[track.id]) &&
            (!q || track.title.toLowerCase().includes(q) || track.artist.toLowerCase().includes(q)),
        );
    };
    for (const query of ['', 'a', 'arijit', 'shape of', 'ZZZ']) {
      for (const filter of ['all', 'liked'] as const) {
        const likeSets: Record<string, boolean>[] = [{}, { a: true }, { a: true, c: true }];
        for (const likes of likeSets) {
          expect(filterTracks(LIB, query, filter, likes)).toEqual(old(LIB, query, filter, likes));
        }
      }
    }
  });
});
