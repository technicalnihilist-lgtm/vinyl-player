/**
 * Storing a value a moment after it stops changing.
 *
 * Two problems this exists to solve, both of them measured in disk writes:
 *
 * 1. Dragging the glass or corner slider used to write on every step of the
 *    drag. One write, a moment later, is the same thing.
 * 2. Both the settings and the style wrote their freshly *loaded* value straight
 *    back the first time their effect ran — so every single launch cost two
 *    writes to store exactly what was already on disk. The first value a hook
 *    sees is the value it just read, and `firstRun()` below is what lets it say
 *    so.
 */

/** The two methods of local storage we use. Narrow, so a test can stand in. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    // Absent in a test runner, and throwing in private mode on some browsers.
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * Write `value` under `key` as JSON once `delay` ms have passed without another
 * call. Returns a cancel function, which is what an effect's cleanup should be.
 *
 * A storage that refuses the write (a full quota, a locked-down browser) is
 * survivable: the app carries on and simply forgets, as it always has.
 */
export function persistSoon(
  key: string,
  value: unknown,
  delay = 250,
  store: KeyValueStore | null = defaultStore(),
): () => void {
  const timer = setTimeout(() => {
    if (!store) return;
    try {
      store.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore — private mode or a full quota */
    }
  }, delay);
  return () => clearTimeout(timer);
}

/**
 * True the first time it is called for a given ref, false afterwards.
 *
 * Used to skip the effect run that follows a hook's initial state: that run is
 * the value that was just loaded, and writing it back is a write for nothing.
 */
export function firstRun(seen: { current: boolean }): boolean {
  if (seen.current) return false;
  seen.current = true;
  return true;
}
