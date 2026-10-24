import type { PlayerState } from '../state/player';
import type { usePlayer } from '../hooks/usePlayer';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, RepeatIcon, RepeatOneIcon, ShuffleIcon } from './Icons';

type Actions = ReturnType<typeof usePlayer>['actions'];

interface Props {
  state: PlayerState;
  actions: Actions;
}

export function TransportControls({ state, actions }: Props) {
  const { isPlaying, shuffle, repeat, status, error } = state;
  const loading = status === 'loading';

  return (
    <div className="transport" role="group" aria-label="Playback controls">
      <button
        type="button"
        className={`icon-btn${shuffle ? ' is-active' : ''}`}
        aria-pressed={shuffle}
        aria-label="Shuffle"
        title="Shuffle"
        onClick={actions.toggleShuffle}
      >
        <ShuffleIcon />
      </button>

      <button type="button" className="icon-btn" aria-label="Previous track" title="Previous" onClick={actions.prev}>
        <PrevIcon />
      </button>

      <button
        type="button"
        className={`transport__play${loading ? ' is-loading' : ''}`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        title={isPlaying ? 'Pause' : 'Play'}
        aria-busy={loading}
        onClick={actions.toggle}
      >
        {loading ? (
          <span className="spinner" aria-hidden="true" />
        ) : isPlaying ? (
          <PauseIcon size={24} />
        ) : (
          <PlayIcon size={24} />
        )}
      </button>

      <button type="button" className="icon-btn" aria-label="Next track" title="Next" onClick={actions.next}>
        <NextIcon />
      </button>

      <button
        type="button"
        className={`icon-btn${repeat !== 'off' ? ' is-active' : ''}`}
        aria-pressed={repeat !== 'off'}
        aria-label={`Repeat: ${repeat}`}
        title={`Repeat: ${repeat}`}
        onClick={actions.cycleRepeat}
      >
        {repeat === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
      </button>

      {error && (
        <span className="transport__error" role="alert" title={error} aria-label={error}>
          !
        </span>
      )}
    </div>
  );
}
