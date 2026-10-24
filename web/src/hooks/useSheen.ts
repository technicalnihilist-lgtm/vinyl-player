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

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
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
