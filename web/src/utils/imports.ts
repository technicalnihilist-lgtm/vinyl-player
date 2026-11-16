/**
 * The files the listener has already added.
 *
 * "Add files" and "Add a folder" hand over whatever was picked, and every pick
 * was given a fresh set of ids — `import-<time>-<n>` — so the playlist's own
 * duplicate check, which compares ids, never had anything to compare. Picking
 * the same folder twice therefore added every song in it a second time: the
 * list doubled, the hearts the listener had given the first copies no longer
 * matched the second, and the import paid for a metadata read per file to
 * discover a duration it already knew.
 *
 * A file is identified by the three things that make it that file: its name, its
 * size and the moment it was last written. Those survive being picked again,
 * they survive a reload, and they cost nothing to read — they are already on the
 * `File` object the picker handed over.
 */

/** The part of a picked file this module needs. */
export interface PickedFile {
  name: string;
  size: number;
  lastModified: number;
}

/**
 * The key a picked file is remembered by.
 *
 * Only the fields above: the same file picked from the same folder answers the
 * same key, whatever the picker did with its path.
 */
export function importKey(file: PickedFile): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

/**
 * The keys of the songs already in the playlist, as one set.
 *
 * Songs added by hand carry the key they were imported under; anything else — a
 * device track, a search result — carries none and is skipped. Built once per
 * import rather than per file, so the check below is a hash lookup.
 */
export function importedKeys(tracks: readonly { importKey?: string }[]): Set<string> {
  const keys = new Set<string>();
  for (const track of tracks) {
    if (track.importKey) keys.add(track.importKey);
  }
  return keys;
}

/**
 * The files that are not already in the playlist.
 *
 * A file that appears twice in one selection is also kept once: the key is added
 * to `known` as the file is accepted, so the second copy is the one that is
 * dropped. The set is updated in place, so the caller can use it to stamp the
 * tracks it is about to build.
 */
export function freshFiles<T extends PickedFile>(files: readonly T[], known: Set<string>): T[] {
  const fresh: T[] = [];
  for (const file of files) {
    const key = importKey(file);
    if (known.has(key)) continue;
    known.add(key);
    fresh.push(file);
  }
  return fresh;
}
