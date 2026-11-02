import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { clampTime, formatTime, progressPercent } from '../utils/format';
import { seekTarget } from '../utils/timeline';

interface Props {
  current: number;
  duration: number;
  onSeek: (time: number) => void;
  /**
   * Move the audio without publishing the position. Used during a drag: the rail
   * is already showing the preview, so publishing every pointermove only made the
   * whole app re-render for a value nothing was reading.
   */
  onScrub?: (time: number) => void;
}

/** Seekable progress bar. Position always comes from the audio element. */
export function Timeline({ current, duration, onSeek, onScrub }: Props) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(0);

  /**
   * The rail's box, measured once when the drag starts.
   *
   * It was measured inside `timeFromClientX`, which meant a
   * `getBoundingClientRect` on every pointermove — a forced synchronous layout,
   * a hundred times during one drag, in the middle of the scroll-and-seek path.
   * The rail does not move while a finger is on it, so one measurement is
   * enough.
   */
  const geom = useRef({ left: 0, width: 0 });
  /** The position the finger is at, waiting to be applied on the next frame. */
  const pending = useRef<number | null>(null);
  const frame = useRef(0);

  const measure = () => {
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    geom.current = { left: rect.left, width: rect.width };
  };

  const timeAt = (clientX: number): number =>
    seekTarget(clientX, geom.current.left, geom.current.width, duration);

  /**
   * Apply the newest position, at most once a frame. A fast drag fires
   * `pointermove` far more often than the screen refreshes, and every one of
   * them used to set state and seek the audio element.
   */
  const flush = () => {
    frame.current = 0;
    const time = pending.current;
    if (time === null) return;
    pending.current = null;
    setPreview(time);
    (onScrub ?? onSeek)(time);
  };

  const cancelFrame = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
  };

  useEffect(() => cancelFrame, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    measure();
    const t = timeAt(e.clientX);
    setDragging(true);
    setPreview(t);
    onSeek(t);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    pending.current = timeAt(e.clientX);
    if (!frame.current) frame.current = requestAnimationFrame(flush);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    cancelFrame();
    pending.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    // One published position for the whole drag, where the finger let go.
    measure();
    onSeek(timeAt(e.clientX));
  };

  /**
   * The gesture was taken away, not finished — a system swipe, an incoming call,
   * the notification shade coming down over the bar.
   *
   * A `pointercancel` carries no usable position (its `clientX` is 0), so
   * treating it like a release seeked the track back to its very beginning: the
   * song audibly restarted for a gesture the listener never completed. Where the
   * finger actually was is what gets published.
   */
  const onPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    cancelFrame();
    const last = pending.current ?? preview;
    pending.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    onSeek(clampTime(last, duration));
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
        onPointerCancel={onPointerCancel}
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
