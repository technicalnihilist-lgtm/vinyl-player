/**
 * The now-playing card in the system's media controls.
 *
 * Android has no Dynamic Island — that is an iPhone feature. What Android gives
 * an app instead is a MediaSession plus a media notification, and that is what
 * appears on the lock screen, in the notification shade, in the quick-settings
 * media player, and in the control centre that Xiaomi, Realme and Honor build on
 * top of it. So this is the same idea, done the way Android does it.
 *
 * Everything here is a no-op in a plain browser: the bridge only exists inside
 * the Android shell.
 */

export interface NowPlaying {
  title: string;
  artist: string;
  album: string;
  playing: boolean;
  /** milliseconds */
  position: number;
  /** milliseconds */
  duration: number;
}

interface NativeNowPlaying {
  nowPlaying?: (json: string) => void;
}

function bridge(): NativeNowPlaying | null {
  if (typeof window === 'undefined') return null;
  const b = (window as unknown as { AndroidBridge?: NativeNowPlaying }).AndroidBridge;
  return b && typeof b.nowPlaying === 'function' ? b : null;
}

/** True when the shell can actually show a card. */
export function hasNowPlaying(): boolean {
  return bridge() !== null;
}

/** The last payload that went across, so an identical one is not sent again. */
let lastSent = '';

/** Tell the system what is playing. Returns false when there is nothing to tell. */
export function publishNowPlaying(np: NowPlaying): boolean {
  const b = bridge();
  if (!b?.nowPlaying) return false;
  try {
    const json = JSON.stringify(np);
    if (json === lastSent) return true;
    lastSent = json;
    b.nowPlaying(json);
    return true;
  } catch {
    return false;
  }
}

/**
 * Register the handler the shell calls when one of the media buttons is
 * pressed. Returns a cleanup function.
 *
 * The native side keeps one object on `window.vinylNative`, so this merges into
 * it rather than replacing it — replacing would silently unhook whatever the
 * library refresh registered a moment earlier.
 */
export function onMediaAction(handler: (action: string) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const w = window as unknown as { vinylNative?: Record<string, unknown> };
  w.vinylNative = { ...(w.vinylNative ?? {}), mediaAction: handler };
  return () => {
    if (w.vinylNative && w.vinylNative.mediaAction === handler) {
      delete w.vinylNative.mediaAction;
    }
  };
}
