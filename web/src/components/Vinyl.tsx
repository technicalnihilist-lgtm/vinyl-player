import type { CSSProperties } from 'react';
import type { Track } from '../types';
import { Artwork } from './Artwork';

interface Props {
  track: Track;
  isPlaying: boolean;
  reducedMotion: boolean;
  /** Whether the record is allowed to turn (a setting). */
  spin?: boolean;
}

/**
 * The vinyl record. The disc element is stable across track changes; only the
 * label artwork inside the spinning layer swaps, so the record never jumps,
 * resizes or resets its rotation angle when a new song loads.
 *
 * Rotation is a pure CSS animation whose play-state follows `isPlaying`, which
 * means pausing freezes the current angle and resuming continues from it.
 */
export function Vinyl({ track, isPlaying, reducedMotion, spin = true }: Props) {
  const spinning = isPlaying && !reducedMotion && spin;

  return (
    <div className="vinyl" style={{ '--accent': track.palette[1] } as CSSProperties}>
      <div className="vinyl__glow" aria-hidden="true" />
      <div className="vinyl__disc">
        <div className="vinyl__grooves" aria-hidden="true" />
        <div className="vinyl__spinner" style={{ animationPlayState: spinning ? 'running' : 'paused' }}>
          <div className="vinyl__sheen" aria-hidden="true" />
          <div className="vinyl__label">
            <Artwork track={track} className="vinyl__art" />
            <span className="vinyl__hole" aria-hidden="true" />
          </div>
        </div>
        <div className="vinyl__ring" aria-hidden="true" />
      </div>
    </div>
  );
}
