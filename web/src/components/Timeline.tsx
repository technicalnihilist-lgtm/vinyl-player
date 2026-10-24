import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { clampTime, formatTime, progressPercent } from '../utils/format';

interface Props {
  current: number;
  duration: number;
  onSeek: (time: number) => void;
}

/** Seekable progress bar. Position always comes from the audio element. */
export function Timeline({ current, duration, onSeek }: Props) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(0);

  const timeFromClientX = (clientX: number): number => {
    const rail = railRef.current;
    if (!rail || duration <= 0) return 0;
    const rect = rail.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return clampTime(ratio * duration, duration);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const t = timeFromClientX(e.clientX);
    setDragging(true);
    setPreview(t);
    onSeek(t);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const t = timeFromClientX(e.clientX);
    setPreview(t);
    onSeek(t);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    let next = current;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = current + 5;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = current - 5;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = duration;
        break;
      default:
        return;
    }
    e.preventDefault();
    onSeek(clampTime(next, duration));
  };

  const shown = dragging ? preview : current;
  const pct = progressPercent(shown, duration);

  return (
    <div className="timeline">
      <span className="timeline__time">{formatTime(shown)}</span>
      <div
        className="timeline__rail"
        ref={railRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration) || 0}
        aria-valuenow={Math.round(shown) || 0}
        aria-valuetext={`${formatTime(shown)} of ${formatTime(duration)}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div className="timeline__track" />
        <div className="timeline__fill" style={{ width: `${pct}%` }} />
        <div className="timeline__handle" style={{ left: `${pct}%` }} />
      </div>
      <span className="timeline__time timeline__time--total">{formatTime(duration)}</span>
    </div>
  );
}
