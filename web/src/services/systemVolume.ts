/**
 * The phone's media volume.
 *
 * A WebView's `<audio>.volume` is a separate knob from the phone's media volume,
 * and the page cannot read the system one — so inside the Android shell the
 * shell owns it. The slider sets the phone's media volume, and a hardware volume
 * press comes back the other way, which is what "reacts to the phone's volume"
 * actually means.
 *
 * In a plain browser none of this exists and the slider drives the element, as
 * before.
 */

interface NativeVolume {
  setSystemVolume?: (fraction: number) => void;
}

function bridge(): NativeVolume | null {
  if (typeof window === 'undefined') return null;
  const b = (window as unknown as { AndroidBridge?: NativeVolume }).AndroidBridge;
  return b && typeof b.setSystemVolume === 'function' ? b : null;
}

/** True when the phone's own media volume is the thing being controlled. */
export function hasSystemVolume(): boolean {
  return bridge() !== null;
}

/** Ask the shell to set the phone's media volume. */
export function setSystemVolume(fraction: number): boolean {
  const b = bridge();
  if (!b?.setSystemVolume) return false;
  try {
    b.setSystemVolume(fraction);
    return true;
  } catch {
    return false;
  }
}

/**
 * Register the callback the shell calls when the phone's volume changes — from
 * the hardware keys, or from anywhere else. Returns a cleanup function.
 *
 * Merges into `window.vinylNative` rather than replacing it, so it does not
 * unhook the library refresh or the media buttons.
 */
export function onSystemVolume(handler: (fraction: number) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const w = window as unknown as { vinylNative?: Record<string, unknown> };
  w.vinylNative = { ...(w.vinylNative ?? {}), systemVolume: handler };
  return () => {
    if (w.vinylNative && w.vinylNative.systemVolume === handler) {
      delete w.vinylNative.systemVolume;
    }
  };
}
