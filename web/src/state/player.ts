import type { PlaybackStatus, RepeatMode, Track } from '../types';

/**
 * One authoritative player state. Every UI surface (vinyl, playlist row,
 * timeline, transport, visualizer) reads from here so they can never disagree.
 */
export interface PlayerState {
  tracks: Track[];
  /** Index into `tracks` of the active track. */
  currentIndex: number;
  status: PlaybackStatus;
  /** The user's play/pause *intent*. The audio element is synced to it. */
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  error: string | null;
  liked: Record<string, boolean>;
  /**
   * Playback order (indices into `tracks`), and only meaningful when shuffle is on.
   * With shuffle off the order *is* the library order, index for index, so this is
   * left empty rather than filled with an array that says exactly that.
   */
  order: number[];
  /** Bumped whenever playback must restart from 0 on the *same* index (repeat-one). */
  nonce: number;
}

export type Action =
  | { type: 'INIT'; tracks: Track[] }
  | { type: 'ADD_TRACKS'; tracks: Track[] }
  | { type: 'ADD_AND_PLAY'; tracks: Track[] }
  | { type: 'SET_LIBRARY'; tracks: Track[] }
  | { type: 'SET_INDEX'; index: number; autoplay: boolean }
  | { type: 'SET_STATUS'; status: PlaybackStatus; error?: string | null }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'ENDED' }
  | { type: 'SET_TIME'; time: number }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'CYCLE_REPEAT' }
  | { type: 'TOGGLE_LIKE'; id: string };

export const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** Fisher–Yates shuffle with an injectable RNG so it is deterministic in tests. */
export function shuffled(n: number, rand: () => number = Math.random, first?: number): number[] {
  const arr = range(n);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (first !== undefined && n > 0) {
    const at = arr.indexOf(first);
    if (at > 0) [arr[0], arr[at]] = [arr[at], arr[0]];
  }
  return arr;
}

export const activeOrder = (state: PlayerState): number[] =>
  state.shuffle ? state.order : range(state.tracks.length);

/**
 * Where each index sits in a play order.
 *
 * `step()` needs the position of the playing track inside the shuffled order, and
 * asked for it with `order.indexOf()` — a scan of the whole order on every next,
 * previous and end-of-track. With shuffle on and a full phone that is a few
 * thousand comparisons per press, on the path a track change takes.
 *
 * An order is replaced wholesale whenever it changes (shuffle toggled, the library
 * rescanned, tracks added), never edited in place, so the map is cached against
 * the array itself and goes away with it.
 */
const orderPositions = new WeakMap<number[], Map<number, number>>();

function positionsOf(order: number[]): Map<number, number> {
  const cached = orderPositions.get(order);
  if (cached) return cached;
  const positions = new Map<number, number>();
  for (let i = 0; i < order.length; i++) positions.set(order[i], i);
  orderPositions.set(order, positions);
  return positions;
}

/**
 * The shuffle order, carried across a library change.
 *
 * A rescan replaces the whole list, and the Android shell runs one every time the
 * app comes back to the foreground. With shuffle on, `SET_LIBRARY` answered that
 * with a brand-new `shuffled()` of the new list — so the sequence you had been
 * listening to was re-rolled every time you unlocked the phone: the song that was
 * about to play was a different one, and Next went somewhere new for no reason.
 *
 * The sequence is kept instead, translated from the old indices to the new ones
 * through the track ids, which are what survive a rescan. Tracks that have left
 * the library drop out of it, and tracks that are new to the library go on the
 * end. Only an order that was never built (an empty library) is shuffled afresh.
 */
function carryOrder(state: PlayerState, tracks: Track[], currentIndex: number): number[] {
  if (state.order.length === 0) return shuffled(tracks.length, Math.random, currentIndex);

  const at = new Map<string, number>();
  for (let i = 0; i < tracks.length; i++) at.set(tracks[i].id, i);

  const out: number[] = [];
  const taken = new Set<number>();
  for (let i = 0; i < state.order.length; i++) {
    const track = state.tracks[state.order[i]];
    const now = track ? at.get(track.id) : undefined;
    if (now === undefined || taken.has(now)) continue;
    taken.add(now);
    out.push(now);
  }
  for (let i = 0; i < tracks.length; i++) if (!taken.has(i)) out.push(i);
  return out;
}

export interface StepResult {
  index: number;
  /** True when playback should stop (end of list, repeat off). */
  stop: boolean;
  /** True when the *same* track should restart from the top (repeat one). */
  replay: boolean;
}

/**
 * Resolve the target index when moving `dir` (+1 next / -1 prev).
 * `atEnd` marks an automatic advance triggered by the track finishing.
 */
export function step(state: PlayerState, dir: 1 | -1, atEnd: boolean): StepResult {
  const total = state.tracks.length;
  if (total === 0) return { index: 0, stop: true, replay: false };
  if (total === 1) {
    if (dir === 1 && atEnd) {
      return state.repeat === 'one' || state.repeat === 'all'
        ? { index: 0, stop: false, replay: true }
        : { index: 0, stop: true, replay: false };
    }
    return { index: 0, stop: false, replay: false };
  }

  if (dir === 1 && atEnd && state.repeat === 'one') {
    return { index: state.currentIndex, stop: false, replay: true };
  }

  // With shuffle off the play order is the library order, index for index, so
  // the neighbour can be read straight off the current index. Building the order
  // first meant every next/previous allocated an array as long as the library —
  // five thousand entries on a full phone — to answer a single step, and then
  // handed it to the collector.
  const order = state.shuffle ? state.order : null;
  const length = order ? order.length : total;
  // `?? -1` is what `indexOf` answered for an index that is not in the order at
  // all — a stale order, or a library that changed underneath it — so the walk
  // below behaves exactly as it did.
  const pos = order ? (positionsOf(order).get(state.currentIndex) ?? -1) : state.currentIndex;
  let nextPos = pos + dir;

  if (nextPos >= length) {
    if (state.repeat === 'all') nextPos = 0;
    else if (atEnd) return { index: state.currentIndex, stop: true, replay: false };
    else nextPos = length - 1; // manual "next" at the end, repeat off → stay put
  }
  if (nextPos < 0) {
    nextPos = state.repeat === 'all' ? length - 1 : 0;
  }

  return { index: order ? order[nextPos] : nextPos, stop: false, replay: false };
}

const trackDuration = (tracks: Track[], index: number): number => tracks[index]?.duration ?? 0;

export function initState(tracks: Track[]): PlayerState {
  return {
    tracks,
    currentIndex: 0,
    status: 'idle',
    isPlaying: false,
    currentTime: 0,
    duration: trackDuration(tracks, 0),
    volume: 0.8,
    muted: false,
    shuffle: false,
    repeat: 'off',
    error: null,
    liked: {},
    // Nothing to build: with shuffle off the play order is the index itself. See
    // the note on `order` above.
    order: [],
    nonce: 0,
  };
}

export const initialState: PlayerState = initState([]);

export function playerReducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case 'INIT':
      return initState(action.tracks);

    case 'ADD_TRACKS': {
      const known = new Set(state.tracks.map((t) => t.id));
      const incoming = action.tracks.filter((t) => !known.has(t.id));
      if (incoming.length === 0) return state; // nothing new — no duplicate rows
      const start = state.tracks.length;
      const tracks = [...state.tracks, ...incoming];
      const order = state.shuffle
        ? [...state.order, ...shuffled(incoming.length).map((i) => i + start)]
        : state.order;
      const first = state.tracks.length === 0;
      return {
        ...state,
        tracks,
        order,
        currentIndex: first ? 0 : state.currentIndex,
        duration: first ? trackDuration(tracks, 0) : state.duration,
      };
    }

    case 'ADD_AND_PLAY': {
      const first = action.tracks[0];
      if (!first) return state;

      // Already in the playlist? Just jump to it — never duplicate the row.
      const existing = state.tracks.findIndex((t) => t.id === first.id);
      if (existing >= 0) {
        return {
          ...state,
          currentIndex: existing,
          currentTime: 0,
          duration: trackDuration(state.tracks, existing),
          isPlaying: true,
          status: 'loading',
          error: null,
          nonce: state.nonce + 1,
        };
      }

      const start = state.tracks.length;
      const tracks = [...state.tracks, ...action.tracks];
      const order = state.shuffle
        ? [...state.order, ...shuffled(action.tracks.length).map((i) => i + start)]
        : state.order;
      return {
        ...state,
        tracks,
        order,
        currentIndex: start,
        currentTime: 0,
        duration: trackDuration(tracks, start),
        isPlaying: true,
        status: 'loading',
        error: null,
        nonce: state.nonce + 1,
      };
    }

    case 'SET_LIBRARY': {
      // Replace the whole list (a device rescan), keeping the current song if
      // it is still there.
      const currentId = state.tracks[state.currentIndex]?.id;
      const tracks = action.tracks;
      const at = currentId ? tracks.findIndex((t) => t.id === currentId) : -1;
      const index = at >= 0 ? at : 0;

      if (tracks.length === 0) {
        return {
          ...state,
          tracks,
          order: [],
          currentIndex: 0,
          currentTime: 0,
          duration: 0,
          isPlaying: false,
          status: 'idle',
          error: null,
        };
      }

      const sameTrack = at >= 0;
      return {
        ...state,
        tracks,
        order: state.shuffle ? carryOrder(state, tracks, index) : state.order,
        currentIndex: index,
        currentTime: sameTrack ? state.currentTime : 0,
        duration: trackDuration(tracks, index),
        // A rescan must never silently restart or stop what is playing.
        isPlaying: sameTrack ? state.isPlaying : false,
        status: sameTrack ? state.status : 'paused',
        nonce: sameTrack ? state.nonce : state.nonce + 1,
      };
    }

    case 'SET_INDEX': {
      if (action.index < 0 || action.index >= state.tracks.length) return state;
      if (action.index === state.currentIndex && action.autoplay === state.isPlaying) return state;
      return {
        ...state,
        currentIndex: action.index,
        currentTime: 0,
        duration: trackDuration(state.tracks, action.index),
        isPlaying: action.autoplay,
        status: action.autoplay ? 'loading' : 'paused',
        error: null,
        nonce: state.nonce + 1,
      };
    }

    case 'SET_STATUS': {
      const error = action.error === undefined ? state.error : action.error;
      // The same status and the same message is the same state. Returning the
      // object we were handed lets React skip the re-render entirely, which is
      // what makes a repeated event free.
      if (action.status === state.status && error === state.error) return state;
      return { ...state, status: action.status, error };
    }

    // Saying "play" while it is playing is not a change, and neither is saying
    // "pause" while it is paused. Three things reach these two: the buttons on the
    // system's media card, the shell echoing a hardware button back, and the
    // element's own events. Each used to replace the state — a new object, and with
    // it a re-render of the whole app — to say exactly what it already said.
    case 'PLAY':
      if (state.isPlaying && state.status === 'playing' && state.error === null) return state;
      return { ...state, isPlaying: true, status: state.status === 'error' ? 'loading' : 'playing', error: null };

    case 'PAUSE':
      if (!state.isPlaying && state.status === 'paused') return state;
      return { ...state, isPlaying: false, status: 'paused' };

    case 'TOGGLE':
      return state.isPlaying
        ? { ...state, isPlaying: false, status: 'paused' }
        : { ...state, isPlaying: true, status: 'playing', error: null };

    case 'NEXT': {
      const r = step(state, 1, false);
      if (r.stop) return state;
      return {
        ...state,
        currentIndex: r.index,
        currentTime: 0,
        duration: trackDuration(state.tracks, r.index),
        status: state.isPlaying ? 'loading' : 'paused',
        error: null,
        nonce: state.nonce + 1,
      };
    }

    case 'PREV': {
      const r = step(state, -1, false);
      if (r.stop) return state;
      return {
        ...state,
        currentIndex: r.index,
        currentTime: 0,
        duration: trackDuration(state.tracks, r.index),
        status: state.isPlaying ? 'loading' : 'paused',
        error: null,
        nonce: state.nonce + 1,
      };
    }

    case 'ENDED': {
      const r = step(state, 1, true);
      if (r.stop) return { ...state, isPlaying: false, status: 'paused', currentTime: state.duration };
      if (r.replay) return { ...state, currentTime: 0, isPlaying: true, status: 'playing', nonce: state.nonce + 1 };
      return {
        ...state,
        currentIndex: r.index,
        currentTime: 0,
        duration: trackDuration(state.tracks, r.index),
        isPlaying: true,
        status: 'loading',
        error: null,
        nonce: state.nonce + 1,
      };
    }

    // The media element reports the same position and the same duration more than
    // once — a track change fires `durationchange` and `loadedmetadata` with one
    // number, and a seek is followed by a `timeupdate` at the place it sought to.
    // Each of those used to replace the state and re-render the whole app to show
    // what was already on screen.
    case 'SET_TIME':
      return action.time === state.currentTime ? state : { ...state, currentTime: action.time };

    case 'SET_DURATION':
      return action.duration === state.duration ? state : { ...state, duration: action.duration };

    case 'SET_VOLUME': {
      const volume = Math.min(1, Math.max(0, action.volume));
      // Un-muting is a change even when the number is the same.
      if (volume === state.volume && !state.muted) return state;
      return { ...state, volume, muted: false };
    }

    case 'TOGGLE_MUTE':
      return { ...state, muted: !state.muted };

    case 'TOGGLE_SHUFFLE': {
      const shuffle = !state.shuffle;
      // Turning shuffle *off* used to build `range(n)` — the library order, index
      // for index — which is exactly the array 111 took out of the unshuffled
      // path everywhere else, and for exactly the same reason: with shuffle off
      // nothing reads it, because the order *is* the index. Turning it off on a
      // 5,000-song library allocated a 5,000-entry array to say nothing, and
      // dropped the shuffled one on the floor at the same time.
      const order = shuffle ? shuffled(state.tracks.length, Math.random, state.currentIndex) : [];
      return { ...state, shuffle, order };
    }

    case 'CYCLE_REPEAT': {
      const next: RepeatMode = state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
      return { ...state, repeat: next };
    }

    // An un-like is the absence of an entry, not an entry that says `false`.
    //
    // Storing the `false` kept a key for every song that had ever been un-liked,
    // and `liked` is copied on every tap and handed to the list on every render.
    // A listener who had tried a few thousand songs and moved on carried a map
    // that was mostly the word "false" — and the blob written to storage was
    // carrying it too until the next save dropped it. Nothing reads the
    // difference: a like is `liked[id] === true` either way.
    case 'TOGGLE_LIKE': {
      const liked = { ...state.liked };
      if (liked[action.id]) delete liked[action.id];
      else liked[action.id] = true;
      return { ...state, liked };
    }

    default:
      return state;
  }
}
