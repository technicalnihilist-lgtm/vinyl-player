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

const blobCache = new Map<string, string>();

/**
 * Turn a data-URI source into a same-origin Blob URL. This keeps the Web Audio
 * analyser working when a source is inlined as a data URI, instead of producing
 * silence from a tainted source.
 */
export function resolvePlayableUrl(src: string): string {
  if (!src.startsWith('data:')) return src;
  const cached = blobCache.get(src);
  if (cached) return cached;
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
    blobCache.set(src, url);
    return url;
  } catch {
    return src;
  }
}
