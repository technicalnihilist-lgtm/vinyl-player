import type { Track } from '../types';

/** One row of the playlist: a track and where it sits in the library. */
export interface VisibleRow {
  track: Track;
  index: number;
}

/**
 * Every track's title and artist, lowercased, kept against the library array.
 *
 * Matching is case-insensitive, so the search compared the query with
 * `title.toLowerCase()` and `artist.toLowerCase()` for every track — two fresh
 * strings per song, on every keystroke. On a library of a few thousand songs that
 * is thousands of allocations per character typed, all of them immediately
 * garbage, and none of them changing between one character and the next.
 *
 * The library array is replaced whenever the tracks change (a rescan, an import),
 * never edited in place, so the index is cached against the array itself and goes
 * away with it. Nothing is built until there is a query to search for.
 */
interface SearchText {
  title: string[];
  artist: string[];
}

const searchTexts = new WeakMap<Track[], SearchText>();

function searchTextFor(tracks: Track[]): SearchText {
  const cached = searchTexts.get(tracks);
  if (cached) return cached;
  const text: SearchText = {
    title: new Array<string>(tracks.length),
    artist: new Array<string>(tracks.length),
  };
  for (let i = 0; i < tracks.length; i++) {
    text.title[i] = tracks[i].title.toLowerCase();
    text.artist[i] = tracks[i].artist.toLowerCase();
  }
  searchTexts.set(tracks, text);
  return text;
}

/**
 * The rows the list should show, in library order.
 *
 * The obvious way to write this — map every track to `{ track, index }`, then
 * filter — allocates a wrapper object for every song in the library on every
 * keystroke, including the ones it is about to throw away. On a library of a few
 * thousand songs that is a few thousand short-lived objects per character typed,
 * all of it straight into the young generation for the collector to sweep.
 *
 * This is one pass, allocating only for the rows that survive, and it does not
 * touch the lowercase form of the query until there is a query to use.
 */
export function filterTracks(
  tracks: Track[],
  query: string,
  filter: 'all' | 'liked',
  likes: Record<string, boolean>,
): VisibleRow[] {
  const q = query.trim().toLowerCase();
  const out: VisibleRow[] = [];
  // Only paid for when there is something to search for.
  const text = q ? searchTextFor(tracks) : null;

  for (let index = 0; index < tracks.length; index++) {
    const track = tracks[index];
    if (filter === 'liked' && !likes[track.id]) continue;
    if (text && !text.title[index].includes(q) && !text.artist[index].includes(q)) {
      continue;
    }
    out.push({ track, index });
  }

  return out;
}
