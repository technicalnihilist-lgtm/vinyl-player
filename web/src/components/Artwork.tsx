import { useState } from 'react';
import type { Track } from '../types';

/**
 * The covers that turned out not to exist, remembered for the life of the page.
 *
 * A row remembers that its own cover failed, which is enough while the row stays
 * mounted — but a row does not stay mounted. Narrowing the search, changing tab,
 * clearing the query again: each of those unmounts rows and mounts them afresh,
 * and every remounted row asked for the cover of a file that had already answered
 * that it has none. Most files on a phone carry no picture, so that was the common
 * path: on a sixty-song library, one search and one clear cost forty-nine more
 * requests for art that is known to be missing — each of them a request into the
 * shell, an `<img>` element built to receive a 404, and a re-render to hide it.
 *
 * The answer is a property of the file, not of the row, so it is remembered beside
 * them. Bounded, because a session that opens one library after another has no
 * business growing a set of ids for ever.
 */
const NO_COVER = new Set<string>();
const NO_COVER_LIMIT = 20000;

function forgetCover(id: string): void {
  if (NO_COVER.size >= NO_COVER_LIMIT) NO_COVER.clear();
  NO_COVER.add(id);
}

interface Props {
  track: Track;
  className?: string;
}

/**
 * Cover art with a guaranteed fallback.
 *
 * Device tracks point at embedded artwork served by the native side. That can
 * be missing (many files simply have no picture), so a procedural cover is
 * always painted underneath and a real image is layered on top, hiding itself
 * if it fails to load. The listener therefore never sees a blank square.
 */
export function Artwork({ track, className = '' }: Props) {
  // Now a CSS gradient rather than an image URL — see utils/artwork.ts.
  const fallback = track.fallbackArt ?? track.artwork;
  const remote = track.artwork && track.artwork !== fallback ? track.artwork : null;
  // Which cover failed, rather than a bare boolean: a boolean has to be cleared
  // when the track changes, and clearing it in an effect meant every cover in the
  // list rendered once, then rendered again a moment later to re-show an image
  // that had never failed. Naming the track makes the reset part of the answer.
  const [failedId, setFailedId] = useState<string | null>(null);
  // Its own failure, or the file's — whichever came first.
  const failed = failedId === track.id || NO_COVER.has(track.id);

  return (
    <span className={`artwork ${className}`.trim()} style={{ backgroundImage: fallback, backgroundColor: '#0d0a1c' }} aria-hidden="true">
      {remote && !failed && (
        <img
          className="artwork__img"
          src={remote}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          onError={() => {
            forgetCover(track.id);
            setFailedId(track.id);
          }}
        />
      )}
    </span>
  );
}
