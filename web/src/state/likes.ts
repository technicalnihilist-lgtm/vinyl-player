/**
 * The songs the listener has hearted.
 *
 * These used to live only in memory: the heart filled in, the Liked tab filled
 * up, and then closing the app threw all of it away. The one thing in the player
 * that is purely the listener's own opinion was the one thing that was never
 * saved.
 *
 * Stored beside the settings and the style, in the same local store, under the
 * same rules: only values we understand are accepted back, so a corrupted or
 * half-written entry cannot un-like a song or put the player in a state it has
 * no meaning for.
 */

export const LIKES_KEY = 'vinyl.liked';

/** A track id, and whether it is liked. Only `true` is ever stored. */
export type Likes = Record<string, boolean>;

/**
 * Read a stored likes blob. Anything that is not a plain object of
 * `id -> true` is ignored rather than trusted.
 */
export function parseLikes(raw: unknown): Likes {
  if (typeof raw !== 'string' || raw.length === 0) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const out: Likes = {};
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    // Only the likes are kept. An un-liked song is the absence of an entry, so
    // the store stays small and there is nothing to prune.
    if (id && value === true) out[id] = true;
  }
  return out;
}

/** Only the ids that are actually liked — an un-like is the absence of an entry. */
export function likedEntries(likes: Likes): Likes {
  const out: Likes = {};
  for (const [id, liked] of Object.entries(likes)) {
    if (id && liked === true) out[id] = true;
  }
  return out;
}

/** The blob to store. */
export function serializeLikes(likes: Likes): string {
  return JSON.stringify(likedEntries(likes));
}

/** Load the listener's likes, or an empty set when there is nothing stored. */
export function loadLikes(): Likes {
  try {
    if (typeof localStorage === 'undefined') return {};
    return parseLikes(localStorage.getItem(LIKES_KEY));
  } catch {
    // Private mode, a full quota, or a store that refuses to be read.
    return {};
  }
}

/** Save them. Failure is survivable — the app just forgets, as it used to. */
export function saveLikes(likes: Likes): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LIKES_KEY, serializeLikes(likes));
  } catch {
    /* ignore */
  }
}
