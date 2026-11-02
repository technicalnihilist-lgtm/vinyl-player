import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the device has been asked to reduce motion.
 *
 * Read synchronously, on the very first render. This used to start as `false`
 * and correct itself in an effect, which meant the app painted one frame — and
 * kicked off the launch animation, the glass motion and the record's spin — for
 * exactly the people who had told their phone not to do any of that, and then
 * re-rendered to turn it off. Nothing is animated now unless it should be.
 */
export function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(QUERY).matches
    );
  } catch {
    return false;
  }
}

/** Tracks the user's prefers-reduced-motion setting, live. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(QUERY);
    const update = () => setReduced(mq.matches);
    update();
    // `addEventListener` is the modern form; the older Android WebViews this app
    // still supports only ever had `addListener`. Both are handled.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  return reduced;
}
