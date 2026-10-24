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
  /** Playback order (indices into `tracks`). Equals the natural order unless shuffle is on. */
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

  const order = activeOrder(state);
  const pos = order.indexOf(state.currentIndex);
  let nextPos = pos + dir;

  if (nextPos >= order.length) {
    if (state.repeat === 'all') nextPos = 0;
    else if (atEnd) return { index: state.currentIndex, stop: true, replay: false };
    else nextPos = order.length - 1; // manual "next" at the end, repeat off → stay put
  }
  if (nextPos < 0) {
    nextPos = state.repeat === 'all' ? order.length - 1 : 0;
  }

  return { index: order[nextPos], stop: false, replay: false };
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
    order: range(tracks.length),
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
        : range(tracks.length);
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
        : range(tracks.length);
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
        order: state.shuffle ? shuffled(tracks.length, Math.random, index) : range(tracks.length),
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

    case 'SET_STATUS':
      return { ...state, status: action.status, error: action.error === undefined ? state.error : action.error };

    case 'PLAY':
      return { ...state, isPlaying: true, status: state.status === 'error' ? 'loading' : 'playing', error: null };

    case 'PAUSE':
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

    case 'SET_TIME':
      return { ...state, currentTime: action.time };

    case 'SET_DURATION':
      return { ...state, duration: action.duration };

    case 'SET_VOLUME':
      return { ...state, volume: Math.min(1, Math.max(0, action.volume)), muted: false };

    case 'TOGGLE_MUTE':
      return { ...state, muted: !state.muted };

    case 'TOGGLE_SHUFFLE': {
      const shuffle = !state.shuffle;
      const order = shuffle
        ? shuffled(state.tracks.length, Math.random, state.currentIndex)
        : range(state.tracks.length);
      return { ...state, shuffle, order };
    }

    case 'CYCLE_REPEAT': {
      const next: RepeatMode = state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
      return { ...state, repeat: next };
    }

    case 'TOGGLE_LIKE':
      return { ...state, liked: { ...state.liked, [action.id]: !state.liked[action.id] } };

    default:
      return state;
  }
}
