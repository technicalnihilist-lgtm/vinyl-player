import type { Track } from '../types';

/**
 * No songs ship with this app.
 *
 * The playlist is filled from the listener's own music — the device library on
 * Android (`src/services/deviceLibrary.ts`) or files they add by hand — so the
 * app itself distributes no audio.
 */
export const TRACKS: Track[] = [];
