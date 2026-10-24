import type { Track } from '../types';
import { makeArtwork } from '../utils/artwork';

/**
 * Reads the music already on the user's device.
 *
 * The web layer cannot touch the phone's media library on its own, so the
 * Android shell exposes a small bridge (`window.AndroidBridge`) backed by
 * MediaStore. Audio and artwork are served back from our own origin
 * (`https://appassets.androidplatform.net/audio/<id>` and `/art/<id>`), which
 * keeps everything same-origin — no CORS, and the analyser still works.
 *
 * When the bridge is absent (i.e. running as a web page) everything here is
 * simply inert and the listener adds their own files instead.
 */

export type LibraryPermission = 'granted' | 'denied' | 'unknown';

export const NATIVE_ORIGIN = 'https://appassets.androidplatform.net';

export interface NativeBridge {
  getLibrary(): string;
  requestPermission(): void;
  openAppSettings(): void;
  refresh(): void;
}

interface NativePayload {
  permission?: LibraryPermission;
  tracks?: unknown;
}

const PALETTES: [string, string, string][] = [
  ['#7b2ff7', '#f107a3', '#ffd166'],
  ['#00c6ff', '#0072ff', '#a8ff78'],
  ['#f7971e', '#ffd200', '#ff5f6d'],
  ['#12c2e9', '#c471ed', '#f64f59'],
  ['#43cea2', '#185a9d', '#e0f7fa'],
  ['#8e2de2', '#4a00e0', '#c4b5fd'],
  ['#fc466b', '#3f5efb', '#fddb92'],
  ['#f953c6', '#b91d73', '#ffd6e0'],
];

function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const idStr = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/**
 * Turn the native payload into our Track shape. Pure, so it is unit-tested
 * against a captured payload without needing a device.
 */
export function mapDeviceTracks(raw: unknown): Track[] {
  const payload = raw as NativePayload | null;
  const list = payload?.tracks;
  if (!Array.isArray(list)) return [];

  const out: Track[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    const o = item as Record<string, unknown>;
    const id = idStr(o.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const title = str(o.title).trim() || 'Unknown track';
    const artist = str(o.artist).trim() || 'Unknown artist';
    const album = str(o.album).trim();
    const palette = PALETTES[hashOf(title + artist) % PALETTES.length];

    // Always have procedural art to fall back on if the file has no picture.
    const fallbackArt = makeArtwork(palette, (hashOf(id) % 900) + 50);
    const hasArt = o.hasArt !== false;

    out.push({
      id: `device-${id}`,
      title,
      artist,
      album,
      src: `${NATIVE_ORIGIN}/audio/${encodeURIComponent(id)}`,
      duration: num(o.duration),
      palette,
      artwork: hasArt ? `${NATIVE_ORIGIN}/art/${encodeURIComponent(id)}` : fallbackArt,
      fallbackArt,
      source: 'device',
    });
  }
  return out;
}

export function deviceBridge(): NativeBridge | null {
  if (typeof window === 'undefined') return null;
  const b = (window as unknown as { AndroidBridge?: NativeBridge }).AndroidBridge;
  return b && typeof b.getLibrary === 'function' ? b : null;
}

export function hasDeviceLibrary(): boolean {
  return deviceBridge() !== null;
}

export interface DeviceLibrarySnapshot {
  tracks: Track[];
  permission: LibraryPermission;
  /** True while the native side is still scanning. */
  scanning: boolean;
}

export function readDeviceLibrary(): DeviceLibrarySnapshot {
  const bridge = deviceBridge();
  if (!bridge) return { tracks: [], permission: 'unknown', scanning: false };
  try {
    const payload = JSON.parse(bridge.getLibrary()) as NativePayload & { scanning?: boolean };
    return {
      tracks: mapDeviceTracks(payload),
      permission: (payload?.permission as LibraryPermission) ?? 'unknown',
      scanning: Boolean(payload?.scanning),
    };
  } catch {
    return { tracks: [], permission: 'unknown', scanning: false };
  }
}

export function requestLibraryPermission(): void {
  deviceBridge()?.requestPermission();
}

export function openAppSettings(): void {
  deviceBridge()?.openAppSettings();
}

/**
 * Register the callback the native side calls after a scan or a permission
 * change. Returns a cleanup function.
 */
export function onDeviceLibraryChanged(handler: () => void): () => void {
  if (!hasDeviceLibrary()) return () => undefined;
  const w = window as unknown as { vinylNative?: { refresh: () => void } };
  w.vinylNative = { refresh: handler };
  return () => {
    delete w.vinylNative;
  };
}
