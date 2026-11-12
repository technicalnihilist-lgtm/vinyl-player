import { memo, useEffect, useRef, useState } from 'react';
import type { AudioEngine } from '../audio/engine';

const BARS = 36;
/** Never draw faster than this — a 120 Hz screen doesn't need 120 canvas paints. */
// 30fps. The bars are decoration; at 60 they cost a full canvas redraw
// every frame for a difference nobody can see.
const FRAME_MS = 1000 / 30;
/** Below this, the bars are invisible, so there is nothing worth painting. */
const SILENT = 0.006;
/** Below this a bar has stopped moving: repainting it would draw the same picture. */
const STILL = 0.002;

/** Adds one rounded bar to the current path. The caller owns beginPath(). */
function barPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x + w, y, x + w, y, radius);
  ctx.closePath();
}

interface Props {
  engine: AudioEngine;
  isPlaying: boolean;
  reducedMotion: boolean;
}

/**
 * A real Web Audio visualiser.
 *
 * Performance notes: the canvas is painted at most 30×/second regardless of the
 * display refresh rate, the gradients are built once per resize instead of per
 * frame, there is no `shadowBlur` (it is the single most expensive canvas
 * operation), and while the music is silent the loop skips painting entirely.
 *
 * The loop also stops itself once the bars have come to rest with nothing
 * playing — a paused player has no reason to wake the browser 30 times a second
 * to draw a picture that is not changing — and playback starts it again.
 */
export const Visualizer = memo(function Visualizer({ engine, isPlaying, reducedMotion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelsRef = useRef<number[]>(new Array(BARS).fill(0));
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;
  const modeRef = useRef<'live' | 'fallback'>('live');
  const [mode, setMode] = useState<'live' | 'fallback'>('live');
  /** Restarts the paint loop. Set by the effect below, called when playback starts. */
  const wakeRef = useRef<(() => void) | null>(null);

  // The loop puts itself to sleep when the player is idle, so something has to
  // wake it: that is this.
  useEffect(() => {
    if (isPlaying) wakeRef.current?.();
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    /**
     * Paints one frame, and one frame only.
     *
     * Assigning `canvas.width` or `canvas.height` wipes the canvas — that is how
     * a canvas is cleared — and only the paint loop ever redrew it. So the loop
     * is what made the bars survive a resize, and the loop is asleep in two
     * ordinary cases: while the player is paused and the bars have settled, and
     * whenever reduced motion is on, where it never starts at all. Rotate the
     * phone in either of those and the visualiser came back blank, which is a
     * picture the listener could see was wrong.
     *
     * The resize handler below repaints through this when no frame is already
     * scheduled. It is assigned further down, once `step()` exists; a
     * ResizeObserver callback can only arrive after this effect body has run, so
     * the placeholder is never what paints.
     */
    let repaint: () => void = () => {};
    let width = 1;
    let height = 1;
    let grad: CanvasGradient | null = null;
    let reflect: CanvasGradient | null = null;
    // Cap the backing-store resolution: a 3× phone screen does not need a 3×
    // canvas for a bar chart.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const buildGradients = () => {
      grad = ctx.createLinearGradient(0, height, 0, 0);
      grad.addColorStop(0, '#7c3aed');
      grad.addColorStop(0.55, '#6366f1');
      grad.addColorStop(1, '#22d3ee');
      reflect = ctx.createLinearGradient(0, height * 0.7 + 6, 0, height * 0.7 + 6 + height * 0.4);
      reflect.addColorStop(0, 'rgba(124,58,237,0.4)');
      reflect.addColorStop(1, 'rgba(34,211,238,0)');
    };

    // The bar geometry: the gap, the bar width, the baseline, the tallest bar and
    // where each bar starts. All of it depends on the canvas size and nothing
    // else, so it changes on a resize and at no other moment. It was worked out
    // inside the paint instead, which meant every frame — thirty a second — paid
    // for four measurements and seventy-two multiplications to arrive at the same
    // numbers it had the frame before, twice over for the reflection.
    let gap = 2;
    let barW = 1;
    let baseline = 1;
    let maxH = 1;
    const barX = new Float64Array(BARS);
    // One height per bar per frame, worked out once and shared by both passes.
    //
    // The body pass and the reflection both asked for `Math.min(1, level)` and
    // `Math.pow(level, 0.82) * maxH`, so the reflection re-derived, for all
    // thirty-six bars, a height the body had just computed: thirty-six `pow`
    // calls and seventy-two clamps a frame, thirty times a second, to arrive at
    // numbers that were already in hand.
    const heights = new Float64Array(BARS);

    const measureBars = () => {
      gap = Math.max(2, (width / BARS) * 0.34);
      barW = Math.max(1, (width - gap * (BARS - 1)) / BARS);
      baseline = height * 0.7;
      maxH = height * 0.62;
      for (let i = 0; i < BARS; i++) barX[i] = i * (barW + gap);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      measureBars();
      buildGradients();
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      // The resize just emptied the canvas; draw it again unless the loop is
      // going to do it on the next frame anyway.
      if (!raf) repaint();
    });
    ro.observe(canvas);

    let zeroFrames = 0;
    let phase = 0;
    let lastDraw = -FRAME_MS;

    const render = () => {
      const levels = levelsRef.current;

      ctx.clearRect(0, 0, width, height);
      if (!grad) buildGradients();

      // The heights both passes draw from, once each. Same numbers, same power.
      for (let i = 0; i < BARS; i++) {
        const level = Math.min(1, levels[i]);
        heights[i] = level > 0 ? Math.pow(level, 0.82) * maxH : 0;
      }

      // One path and one fill per pass. Every bar used to begin its own path,
      // round four corners and fill on its own — up to 72 fills in a frame for a
      // picture that is one colour. The bars share a single vertical gradient, so
      // they can be one path filled once, and the pixels are identical.
      ctx.beginPath();
      for (let i = 0; i < BARS; i++) {
        const level = Math.min(1, levels[i]);
        if (level < 0.012) continue;
        const h = Math.max(3, heights[i]);
        barPath(ctx, barX[i], baseline - h, barW, h, barW / 2);
      }
      ctx.fillStyle = grad as CanvasGradient;
      ctx.fill();

      ctx.beginPath();
      for (let i = 0; i < BARS; i++) {
        const level = Math.min(1, levels[i]);
        if (level < 0.03) continue;
        const h = Math.max(2, heights[i]) * 0.6;
        barPath(ctx, barX[i], baseline + 6, barW, h, barW / 2);
      }
      ctx.fillStyle = reflect as CanvasGradient;
      ctx.fill();
    };

    /**
     * One frame of the analysis. Returns true when there is nothing left to do:
     * the music is paused and every bar has come to rest, so the caller can stop
     * the loop instead of repainting an unchanged picture.
     */
    const step = (): boolean => {
      const playing = playingRef.current;
      const levels = levelsRef.current;
      const data = engine.getFrequency();

      let peak = 0;
      let moving = false;
      if (data && data.length) {
        const usable = Math.floor(data.length * 0.72);
        const group = Math.max(1, Math.floor(usable / BARS));
        for (let i = 0; i < BARS; i++) {
          let sum = 0;
          const start = i * group;
          for (let j = 0; j < group; j++) sum += data[start + j] || 0;
          const v = sum / group / 255;
          if (v > peak) peak = v;
          const target = playing ? v : 0;
          const next = levels[i] + (target - levels[i]) * (target > levels[i] ? 0.45 : 0.12);
          if (Math.abs(next - levels[i]) > STILL) moving = true;
          levels[i] = next;
        }
      } else {
        for (let i = 0; i < BARS; i++) {
          const next = levels[i] + (0 - levels[i]) * 0.1;
          if (Math.abs(next - levels[i]) > STILL) moving = true;
          levels[i] = next;
        }
      }

      if (playing && data && peak <= 0.015) zeroFrames++;
      else zeroFrames = 0;

      const useFallback = !data || zeroFrames > 150;
      const nextMode: 'live' | 'fallback' = useFallback ? 'fallback' : 'live';
      if (nextMode !== modeRef.current) {
        modeRef.current = nextMode;
        setMode(nextMode);
      }

      if (useFallback) {
        phase += playing ? 0.05 : 0.008;
        for (let i = 0; i < BARS; i++) {
          const target = playing
            ? 0.22 + 0.16 * Math.sin(phase + i * 0.35) + 0.08 * Math.sin(phase * 0.6 + i * 0.9)
            : 0.04;
          const next = levels[i] + (target - levels[i]) * 0.1;
          if (Math.abs(next - levels[i]) > STILL) moving = true;
          levels[i] = next;
        }
      }

      const idle = !playing;

      // Nothing on screen has changed — don't repaint.
      if (idle && !useFallback) {
        let max = 0;
        for (let i = 0; i < BARS; i++) if (levels[i] > max) max = levels[i];
        if (max < SILENT) {
          ctx.clearRect(0, 0, width, height);
          return true;
        }
      }

      render();

      // The bars have settled and nothing is playing: that last paint was the
      // final one, so the loop can stop until playback resumes.
      return idle && !moving;
    };

    // From here on a resize has a way to draw the cleared canvas itself.
    repaint = () => {
      step();
    };

    if (reducedMotion) {
      step();
      raf = 0;
    } else {
      const loop = (t: number) => {
        if (t - lastDraw < FRAME_MS - 1) {
          raf = requestAnimationFrame(loop);
          return;
        }
        lastDraw = t;
        if (step()) {
          raf = 0; // settled and idle — stop until playback starts again
          return;
        }
        raf = requestAnimationFrame(loop);
      };
      const wake = () => {
        if (raf) return;
        lastDraw = -FRAME_MS;
        raf = requestAnimationFrame(loop);
      };
      wakeRef.current = wake;
      wake();
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      wakeRef.current = null;
      ro.disconnect();
    };
  }, [engine, reducedMotion]);

  return (
    <div className="visualizer">
      <canvas ref={canvasRef} className="visualizer__canvas" aria-hidden="true" />
      {mode === 'fallback' && isPlaying && (
        <p className="visualizer__note" role="status">
          Visualiser idle — live analysis isn't available for streamed audio.
        </p>
      )}
    </div>
  );
});
