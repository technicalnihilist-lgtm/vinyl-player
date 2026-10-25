import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Tracks the pointer across a glass surface and exposes its position as the
 * `--mx` / `--my` custom properties, which the surface's specular highlight
 * follows. That moving highlight is what makes the glass read as glass.
 */
export function useSheen(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Only where there is a real pointer. On a touch screen `pointermove` fires
    // on every finger movement — including while scrolling — so this ran a
    // getBoundingClientRect and two style writes on every scroll frame to move a
    // highlight nobody could see.
    if (typeof window.matchMedia === 'function'
        && !window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    let queued = false;
    let lastX = 0;
    let lastY = 0;
    const apply = () => {
      queued = false;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      el.style.setProperty('--mx', `${((lastX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--my', `${((lastY - r.top) / r.height) * 100}%`);
    };
    const onMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      // At most one write per frame, whatever the pointer is doing.
      if (!queued) {
        queued = true;
        requestAnimationFrame(apply);
      }
    };
    const onLeave = () => {
      el.style.setProperty('--mx', '28%');
      el.style.setProperty('--my', '-12%');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [ref]);
}
