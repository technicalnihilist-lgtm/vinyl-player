import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * Everything the player's look is built from, so it can be changed without
 * touching the code. Stored beside the settings, in the same local store.
 */
export interface Style {
  /** The colour the player leans on: the glow, the progress bar, the focus ring. */
  accent: string;
  /** Take the accent from the playing album's cover instead of the one above. */
  accentFromArt: boolean;
  /** Which colour field drifts behind the glass. */
  mood: MoodId;
  /** How much of the glass fill to show, 0–100. */
  glass: number;
  /** Corner roundness in pixels, 8–34. */
  roundness: number;
  /** The record itself. */
  disc: DiscId;
}

export const ACCENTS = [
  { id: 'violet', label: 'Violet', value: '#a855f7' },
  { id: 'indigo', label: 'Indigo', value: '#6366f1' },
  { id: 'blue', label: 'Blue', value: '#3b82f6' },
  { id: 'cyan', label: 'Cyan', value: '#22d3ee' },
  { id: 'emerald', label: 'Emerald', value: '#10b981' },
  { id: 'amber', label: 'Amber', value: '#f59e0b' },
  { id: 'rose', label: 'Rose', value: '#f43f5e' },
  { id: 'pink', label: 'Pink', value: '#ec4899' },
] as const;

export type MoodId = 'glass' | 'midnight' | 'sunset' | 'ocean' | 'forest' | 'mono' | 'candy';

export const MOODS: Record<MoodId, { label: string; swatch: string[]; a: string; b: string; c: string; blob1: string; blob2: string; blob3: string }> = {
  glass: {
    label: 'Liquid Glass',
    swatch: ['#7c3aed', '#2563eb', '#c084fc'],
    a: '#17102e', b: '#0a0716', c: '#04040a',
    blob1: 'rgba(124, 58, 237, 0.85)', blob2: 'rgba(37, 99, 235, 0.8)', blob3: 'rgba(192, 132, 252, 0.75)',
  },
  midnight: {
    label: 'Midnight',
    swatch: ['#1e1b4b', '#0ea5e9', '#6366f1'],
    a: '#0b1030', b: '#060817', c: '#02030a',
    blob1: 'rgba(49, 46, 129, 0.9)', blob2: 'rgba(14, 165, 233, 0.6)', blob3: 'rgba(99, 102, 241, 0.7)',
  },
  sunset: {
    label: 'Sunset',
    swatch: ['#f97316', '#f43f5e', '#a855f7'],
    a: '#2a0f1c', b: '#160713', c: '#080308',
    blob1: 'rgba(249, 115, 22, 0.8)', blob2: 'rgba(244, 63, 94, 0.7)', blob3: 'rgba(168, 85, 247, 0.7)',
  },
  ocean: {
    label: 'Ocean',
    swatch: ['#0891b2', '#14b8a6', '#3b82f6'],
    a: '#062430', b: '#031319', c: '#01070a',
    blob1: 'rgba(8, 145, 178, 0.8)', blob2: 'rgba(20, 184, 166, 0.7)', blob3: 'rgba(59, 130, 246, 0.7)',
  },
  forest: {
    label: 'Forest',
    swatch: ['#059669', '#84cc16', '#0d9488'],
    a: '#07231a', b: '#04120e', c: '#010705',
    blob1: 'rgba(5, 150, 105, 0.8)', blob2: 'rgba(132, 204, 22, 0.55)', blob3: 'rgba(13, 148, 136, 0.7)',
  },
  mono: {
    label: 'Mono',
    swatch: ['#71717a', '#a1a1aa', '#52525b'],
    a: '#141417', b: '#0b0b0d', c: '#050506',
    blob1: 'rgba(160, 160, 172, 0.42)', blob2: 'rgba(120, 120, 134, 0.34)', blob3: 'rgba(200, 200, 214, 0.3)',
  },
  candy: {
    label: 'Candy',
    swatch: ['#ec4899', '#22d3ee', '#f472b6'],
    a: '#2a0b26', b: '#150614', c: '#080308',
    blob1: 'rgba(236, 72, 153, 0.78)', blob2: 'rgba(34, 211, 238, 0.6)', blob3: 'rgba(244, 114, 182, 0.7)',
  },
};

export type DiscId = 'classic' | 'violet' | 'ocean' | 'sunset' | 'emerald' | 'silver';

export const DISCS: Record<DiscId, { label: string; swatch: string; a: string; b: string; c: string }> = {
  classic: { label: 'Classic', swatch: '#1b1b22', a: '#26262f', b: '#101016', c: '#040407' },
  violet: { label: 'Violet', swatch: '#3b1d63', a: '#3a2460', b: '#170d2c', c: '#06030e' },
  ocean: { label: 'Ocean', swatch: '#0e3a4d', a: '#10414f', b: '#08202c', c: '#020a0e' },
  sunset: { label: 'Sunset', swatch: '#5a2318', a: '#5c2a1c', b: '#2a1109', c: '#0d0402' },
  emerald: { label: 'Emerald', swatch: '#0f3a2c', a: '#11412f', b: '#082019', c: '#020a07' },
  silver: { label: 'Silver', swatch: '#9aa0ab', a: '#b6bcc7', b: '#6b7280', c: '#2b2f36' },
};

export const DEFAULT_STYLE: Style = {
  accent: '#a855f7',
  accentFromArt: true,
  mood: 'glass',
  glass: 62,
  roundness: 34,
  disc: 'classic',
};

const STORAGE_KEY = 'vinyl.style';

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function load(): Style {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STYLE;
    const p = JSON.parse(raw) as Partial<Style>;
    const out = { ...DEFAULT_STYLE };
    // Accept only values we understand, so a corrupted store cannot break the UI.
    if (typeof p.accent === 'string' && /^#[0-9a-f]{6}$/i.test(p.accent)) out.accent = p.accent;
    if (typeof p.accentFromArt === 'boolean') out.accentFromArt = p.accentFromArt;
    if (typeof p.mood === 'string' && p.mood in MOODS) out.mood = p.mood as MoodId;
    if (typeof p.disc === 'string' && p.disc in DISCS) out.disc = p.disc as DiscId;
    if (typeof p.glass === 'number' && Number.isFinite(p.glass)) out.glass = clamp(Math.round(p.glass), 0, 100);
    if (typeof p.roundness === 'number' && Number.isFinite(p.roundness)) out.roundness = clamp(Math.round(p.roundness), 8, 34);
    return out;
  } catch {
    return DEFAULT_STYLE;
  }
}

export function useStyle() {
  const [style, setStyle] = useState<Style>(load);

  // Debounced: dragging the glass or corner slider fired this on every step, so
  // a single drag wrote to storage dozens of times. One write, a moment later,
  // is the same thing.
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
      } catch {
        // Private mode or a full quota — the app still works, it just forgets.
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [style]);

  const update = useCallback(<K extends keyof Style>(key: K, value: Style[K]) => {
    setStyle((s) => ({ ...s, [key]: value }));
  }, []);

  const reset = useCallback(() => setStyle(DEFAULT_STYLE), []);

  return { style, update, reset };
}

/**
 * Turns a Style into the CSS custom properties the stylesheet reads. Every
 * colour and measurement in the player comes from these, so changing one here
 * changes the whole look with no re-render of the tree.
 */
export function styleVars(style: Style, accentFromTrack?: string): CSSProperties {
  const m = MOODS[style.mood] ?? MOODS.glass;
  const d = DISCS[style.disc] ?? DISCS.classic;
  const accent = style.accentFromArt && accentFromTrack ? accentFromTrack : style.accent;
  // 0 -> a barely-there wash, 100 -> fully frosted. The four alphas are handed
  // over as plain numbers rather than a multiplier, because calc() inside rgba()
  // is exactly the sort of thing older Android WebViews get wrong.
  const fill = 0.34 + (clamp(style.glass, 0, 100) / 100) * 1.16;
  return {
    '--accent': accent,
    '--bg-a': m.a,
    '--bg-b': m.b,
    '--bg-c': m.c,
    '--blob-1': m.blob1,
    '--blob-2': m.blob2,
    '--blob-3': m.blob3,
    '--disc-a': d.a,
    '--disc-b': d.b,
    '--disc-c': d.c,
    '--g1': (0.26 * fill).toFixed(3),
    '--g2': (0.09 * fill).toFixed(3),
    '--g3': (0.13 * fill).toFixed(3),
    '--g4': (0.22 * fill).toFixed(3),
    '--r-xl': `${style.roundness}px`,
    '--r-lg': `${Math.round(style.roundness * 0.76)}px`,
    '--r-md': `${Math.round(style.roundness * 0.53)}px`,
  } as CSSProperties;
}

/** A short, human summary of the current look — handy for tests and tooltips. */
export function styleSummary(style: Style): string {
  return `${MOODS[style.mood]?.label ?? 'Liquid Glass'} · ${style.accent} · glass ${style.glass} · ${style.roundness}px · ${DISCS[style.disc]?.label}`;
}

export function useStyleSummary(style: Style) {
  return useMemo(() => styleSummary(style), [style]);
}
