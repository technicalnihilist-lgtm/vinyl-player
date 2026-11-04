import { memo } from 'react';
import { MuteIcon, VolumeIcon } from './Icons';

interface Props {
  volume: number;
  muted: boolean;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
}

/**
 * Memoised for the same reason as the transport row: none of these four values
 * changes when the song's position does, so a playback tick has no business
 * rebuilding the slider.
 */
export const VolumeControl = memo(function VolumeControl({ volume, muted, onVolume, onToggleMute }: Props) {
  const value = muted ? 0 : volume;
  return (
    <div className="volume">
      <button
        type="button"
        className="icon-btn icon-btn--sm"
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
        title={muted ? 'Unmute' : 'Mute'}
        onClick={onToggleMute}
      >
        {muted || volume === 0 ? <MuteIcon size={18} /> : <VolumeIcon size={18} />}
      </button>
      <input
        className="volume__range"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        aria-label="Volume"
        onChange={(e) => onVolume(Number.parseFloat(e.target.value))}
      />
    </div>
  );
});
