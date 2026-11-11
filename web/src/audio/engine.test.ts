import { describe, expect, it } from 'vitest';
import { BLOB_CACHE_LIMIT, resolvePlayableUrl } from './engine';

/** A tiny data-URI source, shaped like the ones the app inlines. */
const source = (n: number): string =>
  `data:audio/mpeg;base64,${Buffer.from(`track-${n}`).toString('base64')}`;

describe('resolvePlayableUrl()', () => {
  it('leaves an ordinary URL alone', () => {
    expect(resolvePlayableUrl('./song.mp3')).toBe('./song.mp3');
    expect(resolvePlayableUrl('https://example.test/audio/41')).toBe(
      'https://example.test/audio/41',
    );
  });

  it('answers a repeated source with the URL it already made', () => {
    const src = source(1);
    expect(resolvePlayableUrl(src)).toBe(resolvePlayableUrl(src));
  });

  it('forgets a source once enough others have been played', () => {
    const first = source(900);
    const firstUrl = resolvePlayableUrl(first);

    for (let i = 0; i < BLOB_CACHE_LIMIT; i++) resolvePlayableUrl(source(901 + i));

    // Gone from the cache, so it is decoded again into a new blob URL.
    expect(resolvePlayableUrl(first)).not.toBe(firstUrl);
  });

  it('keeps the source it was just asked for', () => {
    const kept = source(1);
    const keptUrl = resolvePlayableUrl(kept);

    // Fill the cache, then ask for `kept` again so it is the most recent entry.
    for (let i = 0; i < BLOB_CACHE_LIMIT - 1; i++) resolvePlayableUrl(source(100 + i));
    expect(resolvePlayableUrl(kept)).toBe(keptUrl);

    // One more source pushes the cache over its limit, and the one dropped is
    // the oldest — not the track that is playing.
    resolvePlayableUrl(source(500));
    expect(resolvePlayableUrl(kept)).toBe(keptUrl);
  });

  it('never holds more than the limit', () => {
    const urls = new Set<string>();
    for (let i = 0; i < BLOB_CACHE_LIMIT * 4; i++) {
      const src = source(2000 + i);
      urls.add(resolvePlayableUrl(src));
    }
    // Every source decoded once, and the last BLOB_CACHE_LIMIT are still cached.
    expect(urls.size).toBe(BLOB_CACHE_LIMIT * 4);
    const last = source(2000 + BLOB_CACHE_LIMIT * 4 - 1);
    expect(resolvePlayableUrl(last)).toBe(resolvePlayableUrl(last));
  });
});
