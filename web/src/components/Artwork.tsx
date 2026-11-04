import { useState } from 'react';
import type { Track } from '../types';

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
  const failed = failedId === track.id;

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
          onError={() => setFailedId(track.id)}
        />
      )}
    </span>
  );
}
