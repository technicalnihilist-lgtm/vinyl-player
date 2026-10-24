import { useEffect, useState } from 'react';
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
  const fallback = track.fallbackArt ?? track.artwork;
  const remote = track.artwork && track.artwork !== fallback ? track.artwork : null;
  const [failed, setFailed] = useState(false);

  // Reset the failure state when the track changes.
  useEffect(() => setFailed(false), [track.id]);

  return (
    <span className={`artwork ${className}`.trim()} style={{ backgroundImage: `url("${fallback}")` }} aria-hidden="true">
      {remote && !failed && <img className="artwork__img" src={remote} alt="" draggable={false} onError={() => setFailed(true)} />}
    </span>
  );
}
