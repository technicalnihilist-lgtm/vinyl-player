import type { Track } from '../types';

/** One row of the playlist: a track and where it sits in the library. */
export interface VisibleRow {
  track: Track;
  index: number;
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

  for (let index = 0; index < tracks.length; index++) {
    const track = tracks[index];
    if (filter === 'liked' && !likes[track.id]) continue;
    if (q && !track.title.toLowerCase().includes(q) && !track.artist.toLowerCase().includes(q)) {
      continue;
    }
    out.push({ track, index });
  }

  return out;
}
