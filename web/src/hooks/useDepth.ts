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

    /**
     * What the document was last told, so it is not told the same thing twice.
     *
     * `--tilt-x` and `--tilt-y` are set on the root and inherited by everything,
     * so writing either one invalidates the style of the whole document. Both
     * were written on every frame of the ease, including the tail of it, where
     * the value moves by less than the four decimals that are written and the
     * document is therefore recalculated to say exactly what it already said.
     */
    let writtenX = '';
    let writtenY = '';

    const write = () => {
      const x = curX.toFixed(4);
      if (x !== writtenX) {
        writtenX = x;
        root.style.setProperty('--tilt-x', x);
      }
      const y = curY.toFixed(4);
      if (y !== writtenY) {
        writtenY = y;
        root.style.setProperty('--tilt-y', y);
      }
    };

    const tick = () => {
      if (!alive) return;
      curX += (targetX - curX) * 0.09;
      curY += (targetY - curY) * 0.09;
      write();
      if (Math.abs(targetX - curX) > 0.0015 || Math.abs(targetY - curY) > 0.0015) {
        raf = requestAnimationFrame(tick);
      } else {
        curX = targetX;
        curY = targetY;
        write();
        raf = 0; // settled — stop until the next event
      }
    };
    /**
     * Start the ease, unless it would move nothing.
     *
     * Every pointer move and every orientation event kicked a fresh frame, and a
     * phone standing still — or held perfectly level — reports its orientation
     * many times a second without the numbers changing. Each of those frames
     * wrote two inherited custom properties, which is a style recalculation of
     * the entire document, to draw the same tilt as the frame before. When the
     * eased value is already on the target and the document already says so,
     * there is nothing to do.
     */
    const kick = () => {
      if (raf || !alive) return;
      if (
        curX === targetX &&
        curY === targetY &&
        curX.toFixed(4) === writtenX &&
        curY.toFixed(4) === writtenY
      ) {
        return;
      }
      raf = requestAnimationFrame(tick);
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

    // One source, not two. `DeviceOrientationEvent` is defined in every Android
    // WebView, so on a phone both listeners used to be live at once: the
    // gyroscope set the target, and then every finger movement during a scroll
    // overwrote it from the touch position and kicked a fresh rAF chain. The
    // record twitched while you scrolled the list. A fine pointer drives the
    // tilt from the pointer; a touch screen drives it from the gyroscope.
    const finePointer =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
    const useGyro = !finePointer && typeof DeviceOrientationEvent !== 'undefined';
    if (useGyro) window.addEventListener('deviceorientation', onOrient);
    if (finePointer) window.addEventListener('pointermove', onPointer, { passive: true });

    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      if (useGyro) window.removeEventListener('deviceorientation', onOrient);
      if (finePointer) window.removeEventListener('pointermove', onPointer);
      root.style.removeProperty('--tilt-x');
      root.style.removeProperty('--tilt-y');
    };
  }, [enabled]);
}
