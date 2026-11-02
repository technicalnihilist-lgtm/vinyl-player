import { useCallback, useEffect, useRef, useState } from 'react';
import { firstRun, persistSoon } from '../utils/persist';

/** Everything the settings sheet can switch on or off. */
export interface Settings {
  /** The record turns while a song plays. */
  spin: boolean;
  /** Show the audio visualiser under the record. */
  visualiser: boolean;
  /** Full liquid-glass motion. Turn off on an older phone for smoother scrolling. */
  glass: boolean;
  /** Number each row in the playlist. */
  numbers: boolean;
  /** Tighter rows, so more songs fit on screen. */
  compact: boolean;
  /** Start the first song as soon as the app opens. */
  autoplay: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  spin: true,
  visualiser: true,
  glass: true,
  numbers: true,
  compact: false,
  autoplay: false,
};

const STORAGE_KEY = 'vinyl.settings';

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged = { ...DEFAULT_SETTINGS };
    // Only accept keys we know about, and only if they are really booleans —
    // a corrupted store should never put the UI into a weird state.
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      if (typeof parsed[key] === 'boolean') merged[key] = parsed[key] as boolean;
    }
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  // Debounced, and silent on the first run: the value this hook starts with is
  // the value it just read, so writing it back stored what was already there and
  // cost a disk write on every launch.
  const stored = useRef(false);
  useEffect(() => {
    if (firstRun(stored)) return undefined;
    return persistSoon(STORAGE_KEY, settings);
  }, [settings]);

  const toggle = useCallback((key: keyof Settings) => {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  const set = useCallback((key: keyof Settings, value: boolean) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  return { settings, toggle, set, reset };
}
