import { memo } from 'react';
import type { Track } from '../types';
import { formatTime } from '../utils/format';
import { Artwork } from './Artwork';
import { EqualizerIcon, HeartIcon } from './Icons';

interface Props {
  track: Track;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  onSelect: (index: number) => void;
  onToggleLike: (id: string) => void;
  /** Show the row number; when off the column is left clean. */
  showNumbers?: boolean;
}

/**
 * Memoised: the list is re-rendered on every playback tick, and without this
 * every row would re-render several times a second for nothing.
 */
export const TrackRow = memo(function TrackRow({
  track,
  index,
  isActive,
  isPlaying,
  isLiked,
  onSelect,
  onToggleLike,
  showNumbers = true,
}: Props) {
  return (
    <li
      className={`track-row${isActive ? ' is-active' : ''}`}
      data-track-id={track.id}
    >
      <button
        type="button"
        className="row"
        aria-current={isActive ? 'true' : undefined}
        aria-label={`${track.title} — ${track.artist}, ${formatTime(track.duration)}`}
        onClick={() => onSelect(index)}
      >
        <span className="row__lead" aria-hidden="true">
          {isActive ? (
            <EqualizerIcon className={`row__eq${isPlaying ? ' is-playing' : ''}`} />
          ) : showNumbers ? (
            <span className="row__index">{index + 1}</span>
          ) : null}
        </span>

        <Artwork track={track} className="row__art" />

        <span className="row__meta">
          <span className="row__title">{track.title}</span>
          <span className="row__artist">{track.artist}</span>
        </span>

        <span className="row__duration">{formatTime(track.duration)}</span>
      </button>

      <button
        type="button"
        className={`row__like${isLiked ? ' is-liked' : ''}`}
        aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
        aria-pressed={isLiked}
        onClick={() => onToggleLike(track.id)}
      >
        <HeartIcon size={16} filled={isLiked} />
      </button>
    </li>
  );
});
