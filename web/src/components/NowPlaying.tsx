import { memo } from 'react';
import type { Track } from '../types';
import { HeartIcon } from './Icons';

/**
 * The song's title and artist — the two blocks that draw them.
 *
 * Memoised, and given the track rather than the whole player state: the position
 * lands in that state four or five times a second, so the app re-renders just as
 * often, and these blocks were rebuilt on every one of those renders — four
 * elements a tick to draw a song that had not changed. The track object only
 * changes when the song does.
 *
 * The markup is exactly what the app rendered inline before: the same two spans in
 * the top bar, the same heading and line under the record.
 */
export const TopBarNow = memo(function TopBarNow({ track }: { track?: Track }) {
  return (
    <>
      <span className="topbar__title">{track?.title ?? 'Your music'}</span>
      <span className="topbar__artist">{track?.artist ?? 'Offline player'}</span>
    </>
  );
});

export const StageNow = memo(function StageNow({
  track,
  hasLibrary,
}: {
  track?: Track;
  hasLibrary: boolean;
}) {
  return (
    <>
      <h1 className="now__title">{track?.title ?? 'Your music'}</h1>
      <p className="now__artist">
        {track
          ? [track.artist, track.album].filter(Boolean).join(' · ')
          : hasLibrary
            ? 'Play the songs on this device'
            : 'Add your music to get started'}
      </p>
    </>
  );
});

/**
 * The heart beside the transport controls.
 *
 * Memoised for the same reason, and given the two things it actually draws — the
 * id to like, and whether that song is liked — instead of being rebuilt with the
 * app four times a second. `onToggle` is a stable action, so a playback tick now
 * rebuilds neither the button nor the icon inside it.
 */
export const LikeButton = memo(function LikeButton({
  trackId,
  liked,
  onToggle,
}: {
  trackId: string | null;
  liked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`glass-btn${liked ? ' is-liked' : ''}`}
      aria-pressed={liked}
      aria-label="Like current track"
      onClick={() => trackId && onToggle(trackId)}
    >
      <HeartIcon size={18} filled={liked} />
    </button>
  );
});
