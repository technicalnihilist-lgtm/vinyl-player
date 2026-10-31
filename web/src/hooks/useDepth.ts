import { useEffect } from 'react';

/**
 * Drives the 4D effect.
 *
 * Writes a pair of tilt angles to `--tilt-x` / `--tilt-y` on the document root,
 * each in the range -1 to 1. On a phone the source is the gyroscope, so tilting
 * the phone leans the record with it; on a desktop it is the pointer. Either way
 * the value is clamped and then eased toward the target a frame at a time, so it
 * drifts rather than snapping.
 *
 * The loop stops as soon as the value has settled. Leaving a rAF running forever
 * to animate a record that is already still is exactly the sort of thing that
 * costs battery for nothing.
 */
export function useDepth(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;
    let alive = true;

    const clamp = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

    const tick = () => {
      if (!alive) return;
      curX += (targetX - curX) * 0.09;
      curY += (targetY - curY) * 0.09;
      root.style.setProperty('--tilt-x', curX.toFixed(4));
      root.style.setProperty('--tilt-y', curY.toFixed(4));
      if (Math.abs(targetX - curX) > 0.0015 || Math.abs(targetY - curY) > 0.0015) {
        raf = requestAnimationFrame(tick);
      } else {
        curX = targetX;
        curY = targetY;
        root.style.setProperty('--tilt-x', curX.toFixed(4));
        root.style.setProperty('--tilt-y', curY.toFixed(4));
        raf = 0; // settled — stop until the next event
      }
    };
    const kick = () => {
      if (!raf && alive) raf = requestAnimationFrame(tick);
    };

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      // gamma leans left/right, beta leans forward/back; 32 degrees is "full tilt"
      targetX = clamp(e.gamma / 32);
      targetY = clamp((e.beta - 40) / 32);
      kick();
    };
    const onPointer = (e: PointerEvent) => {
      targetX = clamp((e.clientX / window.innerWidth - 0.5) * 2);
      targetY = clamp((e.clientY / window.innerHeight - 0.5) * 2);
      kick();
    };

    const hasGyro = typeof DeviceOrientationEvent !== 'undefined';
    if (hasGyro) window.addEventListener('deviceorientation', onOrient);
    window.addEventListener('pointermove', onPointer, { passive: true });

    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      if (hasGyro) window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('pointermove', onPointer);
      root.style.removeProperty('--tilt-x');
      root.style.removeProperty('--tilt-y');
    };
  }, [enabled]);
}
