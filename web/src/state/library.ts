import type { Track } from '../types';

/**
 * The playlist after the device library has been rescanned.
 *
 * A rescan hands over the phone's own music and nothing else, and the shell
 * rescans every time the app comes back to the foreground. Replacing the list
 * outright therefore took with it the songs the listener had added by hand —
 * pick a folder of files, put the phone down, pick it up again, and the imported
 * songs were gone from the list.
 *
 * So the device's tracks come first, in the order the device reported them, and
 * the imported ones follow. Nothing is duplicated, and when there is nothing to
 * add the device array is returned as it is — the same array, which is what lets
 * the caller's identity check skip a pointless update.
 */
export function mergeLibrary(deviceTracks: Track[], current: Track[]): Track[] {
  const imported = current.filter((track) => track.source === 'import');
  if (imported.length === 0) return deviceTracks;

  const known = new Set(deviceTracks.map((track) => track.id));
  const extra = imported.filter((track) => !known.has(track.id));
  if (extra.length === 0) return deviceTracks;

  return [...deviceTracks, ...extra];
}
