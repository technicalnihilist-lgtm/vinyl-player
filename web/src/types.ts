/** A single playable track. Every field is required except the optional
 *  `artworkOverride`, which lets an imported file supply its own cover. */
export interface Track {
  /** Stable, unique identifier. Used as the React key and the audio src token. */
  id: string;
  title: string;
  artist: string;
  album: string;
  /** Object URL / asset URL / data URI that the <audio> element can load. */
  src: string;
  /** Duration in seconds taken from the audio metadata. 0 means "unknown yet". */
  duration: number;
  /** Data-URI SVG (or a user image) used for the vinyl label and the thumbnail. */
  artwork: string;
  /** Three accent colours driving the artwork and the ambient glow. */
  palette: [string, string, string];
  /** Where the track came from. */
  source?: 'device' | 'import';
  /** Procedural cover shown when `artwork` is missing or fails to load. */
  fallbackArt?: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type PlaybackStatus =
  | 'idle' // nothing loaded yet
  | 'loading' // a source is loading / buffering
  | 'playing'
  | 'paused'
  | 'error';
