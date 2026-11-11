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

    /**
     * The frame waiting to apply the newest pointer position, if one is.
     *
     * Held as a handle rather than a boolean, because a frame that is already
     * queued has to be cancellable. It was not: the frame queued by the last
     * move of a gesture still ran after the pointer had left the surface — and
     * after the surface itself had gone — putting the highlight back where the
     * pointer had been, or writing to an element that was no longer in the
     * document.
     */
    let frame = 0;
    let lastX = 0;
    let lastY = 0;

    // The surface's box, kept between moves.
    //
    // Measuring it inside the per-frame update meant a `getBoundingClientRect` on
    // every frame the pointer moved — and the frame before it had just written two
    // custom properties, so that read was a forced style recalc and layout, up to
    // sixty times a second, on two surfaces at once (the panel and the list). The
    // box only changes when the layout does, so it is measured again when that
    // happens and not otherwise.
    let box: { left: number; top: number; width: number; height: number } | null = null;
    const forgetBox = () => {
      box = null;
    };

    const apply = () => {
      frame = 0;
      if (!box) {
        const r = el.getBoundingClientRect();
        box = { left: r.left, top: r.top, width: r.width, height: r.height };
      }
      if (!box.width || !box.height) return;
      el.style.setProperty('--mx', `${((lastX - box.left) / box.width) * 100}%`);
      el.style.setProperty('--my', `${((lastY - box.top) / box.height) * 100}%`);
    };
    const onMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      // At most one write per frame, whatever the pointer is doing.
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      // Whatever the last move queued would land after this and move the
      // highlight back to the pointer's last position, so it is dropped first.
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      el.style.setProperty('--mx', '28%');
      el.style.setProperty('--my', '-12%');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    // Anything that can move the surface: the window resizing or scrolling, and
    // the surface itself changing size (the panel's collapse, a row count change).
    window.addEventListener('resize', forgetBox, { passive: true });
    window.addEventListener('scroll', forgetBox, { passive: true, capture: true });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(forgetBox) : null;
    observer?.observe(el);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', forgetBox);
      window.removeEventListener('scroll', forgetBox, { capture: true } as EventListenerOptions);
      observer?.disconnect();
    };
  }, [ref]);
}
