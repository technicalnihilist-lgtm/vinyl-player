/**
 * AudioEngine owns exactly one HTMLAudioElement and exactly one AudioContext
 * graph for the lifetime of the app. Centralising them here is what prevents
 * overlapping audio and duplicate AudioContext instances.
 */
export class AudioEngine {
  readonly el: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private freq = new Uint8Array(0);

  /** True once a working analyser graph exists and frequency data can be read. */
  analyserAvailable = false;
  /** True once we have tried and failed to build the graph (e.g. blocked). */
  analyserBlocked = false;

  constructor() {
    this.el = new Audio();
    this.el.preload = 'metadata';
    this.el.setAttribute('data-vinyl-audio', '');
    this.el.hidden = true;
    // NOTE: crossOrigin is deliberately NOT set. It would make the Web Audio
    // analyser work for remote previews only if their host sent CORS headers
    // (it doesn't), and would break playback of them entirely. Leaving it off
    // keeps same-origin (bundled) audio analysable while remote previews still
    // play — the visualiser falls back for those, as documented.
    // Keeping the element in the DOM (rather than detached) plays nicer with
    // media-session integration and makes it inspectable from tests.
    if (typeof document !== 'undefined' && document.body) {
      document.body.appendChild(this.el);
    }
  }

  /**
   * Build the analyser graph on demand. Must be called from a user gesture the
   * first time so the AudioContext is allowed to run.
   */
  ensureAnalyser(): boolean {
    if (this.analyserAvailable) return true;
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.analyserBlocked = true;
        return false;
      }
      if (!this.ctx) this.ctx = new Ctor();
      if (!this.source) {
        this.source = this.ctx.createMediaElementSource(this.el);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.82;
        this.source.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      }
      this.analyserAvailable = true;
      this.analyserBlocked = false;
      return true;
    } catch {
      // SecurityError / NotSupportedError — fall back to the non-reactive mode.
      this.analyserAvailable = false;
      this.analyserBlocked = true;
      return false;
    }
  }

  /** Resume a suspended context (autoplay policies suspend it until a gesture). */
  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore — playback continues through the element where possible */
      }
    }
  }

  /** Latest frequency data, or null when analysis is unavailable. */
  getFrequency(): Uint8Array | null {
    if (!this.analyserAvailable || !this.analyser) return null;
    this.analyser.getByteFrequencyData(this.freq);
    return this.freq;
  }

  /** Tear everything down: nodes, context and the media element. */
  destroy(): void {
    try {
      this.source?.disconnect();
      this.analyser?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      this.el.pause();
      this.el.removeAttribute('src');
      this.el.load();
      this.el.remove();
    } catch {
      /* ignore */
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close().catch(() => undefined);
    }
    this.source = null;
    this.analyser = null;
    this.ctx = null;
    this.freq = new Uint8Array(0);
    this.analyserAvailable = false;
  }
}

/**
 * How many decoded sources are kept, most recent last.
 *
 * Eight is more than a player ever needs at once — the track that is playing,
 * the one before it, and whatever was tried in between — and it is the point at
 * which the cache stops being a cache and starts being a leak. See below.
 */
export const BLOB_CACHE_LIMIT = 8;

const blobCache = new Map<string, string>();

/**
 * Remember `url` for `src`, and forget the least recently asked-for source once
 * there are too many.
 *
 * This map used to grow for the life of the page: every data-URI source that was
 * ever played kept its Blob — the decoded copy of the whole audio file — alive
 * for as long as the app was open. A few dozen of them is tens of megabytes that
 * nothing can free, and a listener who works through a long playlist holds all
 * of it. The cache is worth keeping (it is what stops the same source being
 * decoded twice) but not worth keeping everything.
 *
 * Map iterates in insertion order, and a source is re-inserted when it is asked
 * for again, so the first entry is always the one nothing has touched for
 * longest — never the track that is playing now, which was the last to be
 * resolved.
 */
function remember(src: string, url: string): void {
  blobCache.set(src, url);
  while (blobCache.size > BLOB_CACHE_LIMIT) {
    const oldest = blobCache.keys().next();
    if (oldest.done) break;
    const dropped = blobCache.get(oldest.value);
    blobCache.delete(oldest.value);
    if (dropped) {
      try {
        // Hand the blob back: this is the call that actually frees it.
        URL.revokeObjectURL(dropped);
      } catch {
        /* ignore — the collector takes it when the page goes */
      }
    }
  }
}

/**
 * Turn a data-URI source into a same-origin Blob URL. This keeps the Web Audio
 * analyser working when a source is inlined as a data URI, instead of producing
 * silence from a tainted source.
 */
export function resolvePlayableUrl(src: string): string {
  if (!src.startsWith('data:')) return src;
  const cached = blobCache.get(src);
  if (cached) {
    // Asked for again: move it to the back of the queue, so the source in use is
    // the last one that can be dropped.
    blobCache.delete(src);
    blobCache.set(src, cached);
    return cached;
  }
  try {
    const comma = src.indexOf(',');
    const meta = src.slice(5, comma);
    const isBase64 = /;base64/i.test(meta);
    const mime = meta.split(';')[0] || 'audio/mpeg';
    const body = src.slice(comma + 1);
    let blob: Blob;
    if (isBase64) {
      const binary = atob(body);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      blob = new Blob([bytes], { type: mime });
    } else {
      blob = new Blob([decodeURIComponent(body)], { type: mime });
    }
    const url = URL.createObjectURL(blob);
    remember(src, url);
    return url;
  } catch {
    return src;
  }
}
