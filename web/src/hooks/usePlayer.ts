import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { hasSystemVolume } from '../services/systemVolume';
import { AudioEngine, resolvePlayableUrl } from '../audio/engine';
import { TRACKS } from '../data/tracks';
import {
  deviceBridge,
  hasDeviceLibrary,
  onDeviceLibraryChanged,
  openAppSettings,
  readDeviceLibrary,
  requestLibraryPermission,
  type LibraryPermission,
} from '../services/deviceLibrary';
import { initState, playerReducer } from '../state/player';
import { LIKES_KEY, likedEntries, loadLikes } from '../state/likes';
import { mergeLibrary } from '../state/library';
import type { Track } from '../types';
import { coverGradient } from '../utils/artwork';
import { clampTime } from '../utils/format';
import { firstRun, persistSoon } from '../utils/persist';

const IMPORT_PALETTES: [string, string, string][] = [
  ['#7b2ff7', '#f107a3', '#ffd166'],
  ['#00c6ff', '#0072ff', '#a8ff78'],
  ['#f7971e', '#ffd200', '#ff5f6d'],
  ['#12c2e9', '#c471ed', '#f64f59'],
  ['#43cea2', '#185a9d', '#e0f7fa'],
  ['#8e2de2', '#4a00e0', '#c4b5fd'],
];

/** How many files are probed at once when a batch is imported. */
const IMPORT_CONCURRENCY = 6;

/**
 * The elements used to read durations, handed round instead of made per file.
 *
 * One `<audio>` was built for every file and dropped once it answered, so a
 * folder of five hundred songs built and threw away five hundred media elements,
 * each of which has to be created, wired to a decoder and torn down inside the
 * WebView before the next one can start. Never more than IMPORT_CONCURRENCY are in
 * use at a time — that is exactly how many probes run in parallel — so that many
 * are kept and reused, and the import costs six elements however many files are in
 * the folder.
 */
const idleProbes: HTMLAudioElement[] = [];

function acquireProbe(): HTMLAudioElement {
  const pooled = idleProbes.pop();
  if (pooled) return pooled;
  const probe = new Audio();
  probe.preload = 'metadata';
  return probe;
}

function releaseProbe(probe: HTMLAudioElement): void {
  if (idleProbes.length < IMPORT_CONCURRENCY) idleProbes.push(probe);
}

/** Read a file's duration from its audio metadata (never guessed). */
function readDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const probe = acquireProbe();
    let settled = false;

    const onLoaded = () => {
      const d = probe.duration;
      finish(Number.isFinite(d) && d > 0 ? d : 0);
    };
    const onError = () => finish(0);

    const finish = (d: number) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      // The element is reused, so it must not answer for the file it was given a
      // moment ago: the listeners come off with it.
      probe.removeEventListener('loadedmetadata', onLoaded);
      probe.removeEventListener('error', onError);
      // Dropping the src is not enough on its own: the element keeps whatever it
      // was handed until it is told to let go, so every imported file left a
      // media resource behind for the life of the page. load() with no src
      // releases it.
      probe.removeAttribute('src');
      try {
        probe.load();
      } catch {
        /* ignore — the resource goes when the element does */
      }
      releaseProbe(probe);
      resolve(d);
    };

    const timer = window.setTimeout(() => finish(0), 8000);
    probe.addEventListener('loadedmetadata', onLoaded);
    probe.addEventListener('error', onError);
    probe.src = url;
  });
}

export function usePlayer(initialTracks: Track[] = TRACKS) {
  const [engine] = useState(() => new AudioEngine());
  const [state, dispatch] = useReducer(playerReducer, initialTracks, (tracks) => ({
    ...initState(tracks),
    // The hearts the listener already gave, from the last time the app ran.
    liked: loadLikes(),
  }));

  const stateRef = useRef(state);
  stateRef.current = state;
  const loadedIdRef = useRef<string | null>(null);
  const switchingRef = useRef(false);

  // Keep the hearts. Debounced, like the settings and the style: liking a song is
  // one write, and tapping through a few of them is one write a moment later
  // rather than one per tap. Silent on the first run, which is the set that was
  // just read back.
  const likedStored = useRef(false);
  useEffect(() => {
    if (firstRun(likedStored)) return undefined;
    return persistSoon(LIKES_KEY, likedEntries(state.liked));
  }, [state.liked]);

  const [library, setLibrary] = useState<{ available: boolean; permission: LibraryPermission; scanning: boolean }>(() => ({
    available: hasDeviceLibrary(),
    permission: 'unknown',
    scanning: false,
  }));

  /** The library the reducer was last given, so an identical rescan is skipped. */
  const lastLibraryRef = useRef<Track[] | null>(null);

  /** Pull the device's music library (Android) into the playlist. */
  const syncLibrary = useCallback(() => {
    if (!hasDeviceLibrary()) return;
    const snapshot = readDeviceLibrary();
    setLibrary((prev) =>
      prev.permission === snapshot.permission && prev.scanning === snapshot.scanning
        ? prev
        : { available: true, permission: snapshot.permission, scanning: snapshot.scanning },
    );
    // The same array means the shell's payload had not changed since the last
    // scan. Dispatching anyway would rebuild the playlist — and re-render every
    // row — to show a list identical to the one already on screen.
    if (snapshot.tracks === lastLibraryRef.current) return;
    lastLibraryRef.current = snapshot.tracks;
    // The shell rescans every time the app comes back to the foreground, and a
    // rescan only knows about the phone's own music. Replacing the list outright
    // took the songs added by hand with it, so the two are merged instead.
    dispatch({ type: 'SET_LIBRARY', tracks: mergeLibrary(snapshot.tracks, stateRef.current.tracks) });
  }, []);

  useEffect(() => {
    if (!hasDeviceLibrary()) return;
    syncLibrary();
    return onDeviceLibraryChanged(syncLibrary);
  }, [syncLibrary]);

  // --- media element events (attached exactly once) -------------------------
  useEffect(() => {
    const el = engine.el;
    const onLoadedMetadata = () => {
      switchingRef.current = false;
      const d = el.duration;
      if (Number.isFinite(d) && d > 0) dispatch({ type: 'SET_DURATION', duration: d });
    };
    const onDurationChange = () => {
      const d = el.duration;
      if (Number.isFinite(d) && d > 0) dispatch({ type: 'SET_DURATION', duration: d });
    };
    const onTimeUpdate = () => {
      if (Number.isFinite(el.currentTime)) dispatch({ type: 'SET_TIME', time: el.currentTime });
    };
    const onPlaying = () => {
      switchingRef.current = false;
      dispatch({ type: 'SET_STATUS', status: 'playing' });
      if (!stateRef.current.isPlaying) dispatch({ type: 'PLAY' });
    };
    const onWaiting = () => {
      if (stateRef.current.isPlaying) dispatch({ type: 'SET_STATUS', status: 'loading' });
    };
    const onPause = () => {
      if (switchingRef.current) return;
      if (stateRef.current.isPlaying) dispatch({ type: 'PAUSE' });
    };
    const onEnded = () => dispatch({ type: 'ENDED' });
    const onCanPlay = () => {
      switchingRef.current = false;
    };
    const onError = () => {
      switchingRef.current = false;
      const e = el.error;
      dispatch({
        type: 'SET_STATUS',
        status: 'error',
        error: e ? `Playback failed (media error ${e.code}).` : 'Playback failed.',
      });
    };

    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('durationchange', onDurationChange);
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('durationchange', onDurationChange);
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('error', onError);
      engine.destroy();
    };
  }, [engine]);

  // --- load a new source whenever the active track changes ------------------
  useEffect(() => {
    const track = state.tracks[state.currentIndex];
    if (!track) return;
    if (loadedIdRef.current === track.id) return;
    loadedIdRef.current = track.id;
    switchingRef.current = true;
    engine.el.src = resolvePlayableUrl(track.src);
    try {
      engine.el.load();
    } catch {
      /* ignore */
    }
  }, [engine, state.currentIndex, state.tracks]);

  // --- keep the element's play state in sync with the user's intent ---------
  useEffect(() => {
    const el = engine.el;
    if (state.isPlaying) {
      engine.ensureAnalyser();
      void engine.resume();
      if (el.ended) {
        try {
          el.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err: DOMException) => {
          if (err && err.name === 'AbortError') return; // superseded by a newer load
          dispatch({
            type: 'SET_STATUS',
            status: 'error',
            error:
              err && err.name === 'NotAllowedError'
                ? 'Autoplay was blocked by the browser — press play to start.'
                : `Playback failed: ${err?.message ?? 'unknown error'}.`,
          });
          dispatch({ type: 'PAUSE' });
        });
      }
    } else {
      el.pause();
    }
  }, [engine, state.isPlaying, state.nonce, state.currentIndex]);

  // --- volume / mute --------------------------------------------------------
  // Inside the Android shell the slider drives the phone's media volume, so the
  // element stays at full and only mute touches it. In a browser the slider
  // drives the element directly, as before.
  useEffect(() => {
    engine.el.volume = hasSystemVolume() ? (state.muted ? 0 : 1) : state.muted ? 0 : state.volume;
    engine.el.muted = state.muted;
  }, [engine, state.volume, state.muted]);

  // --- actions --------------------------------------------------------------
  const play = useCallback(() => {
    engine.ensureAnalyser();
    void engine.resume();
    dispatch({ type: 'PLAY' });
  }, [engine]);

  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const toggle = useCallback(() => {
    engine.ensureAnalyser();
    void engine.resume();
    dispatch({ type: 'TOGGLE' });
  }, [engine]);
  const next = useCallback(() => dispatch({ type: 'NEXT' }), []);
  const prev = useCallback(() => dispatch({ type: 'PREV' }), []);

  const selectTrack = useCallback(
    (index: number) => {
      engine.ensureAnalyser();
      void engine.resume();
      const s = stateRef.current;
      if (index === s.currentIndex) {
        dispatch({ type: 'TOGGLE' });
        return;
      }
      dispatch({ type: 'SET_INDEX', index, autoplay: true });
    },
    [engine],
  );

  const seek = useCallback(
    (time: number) => {
      const t = clampTime(time, stateRef.current.duration);
      try {
        engine.el.currentTime = t;
      } catch {
        /* ignore */
      }
      dispatch({ type: 'SET_TIME', time: t });
    },
    [engine],
  );

  /**
   * Move the audio while a seek drag is in progress.
   *
   * Deliberately silent: the bar is already drawing the drag preview, so nothing
   * on screen reads the published position mid-drag — and a position change
   * re-renders the whole app, which a drag would do sixty times a second. The
   * drag publishes once, when it ends.
   */
  const scrub = useCallback(
    (time: number) => {
      const t = clampTime(time, stateRef.current.duration);
      try {
        engine.el.currentTime = t;
      } catch {
        /* ignore */
      }
    },
    [engine],
  );

  const setVolume = useCallback((v: number) => dispatch({ type: 'SET_VOLUME', volume: v }), []);
  const toggleMute = useCallback(() => dispatch({ type: 'TOGGLE_MUTE' }), []);
  const toggleShuffle = useCallback(() => dispatch({ type: 'TOGGLE_SHUFFLE' }), []);
  const cycleRepeat = useCallback(() => dispatch({ type: 'CYCLE_REPEAT' }), []);
  const toggleLike = useCallback((id: string) => dispatch({ type: 'TOGGLE_LIKE', id }), []);

  /** Play a search result immediately (adds it to the playlist if it's new). */
  const playNow = useCallback(
    (track: Track) => {
      engine.ensureAnalyser();
      void engine.resume();
      dispatch({ type: 'ADD_AND_PLAY', tracks: [track] });
    },
    [engine],
  );

  /** Append a search result to the playlist without starting it. */
  const addTrack = useCallback((track: Track) => dispatch({ type: 'ADD_TRACKS', tracks: [track] }), []);

  /** Ask the native side to rescan the device library (it calls us back). */
  const refreshLibrary = useCallback(() => {
    const bridge = deviceBridge();
    if (bridge) bridge.refresh();
    else syncLibrary();
  }, [syncLibrary]);

  /** Trigger the Android runtime permission prompt for the music library. */
  const requestLibraryAccess = useCallback(() => requestLibraryPermission(), []);
  const openSystemSettings = useCallback(() => openAppSettings(), []);

  const importFiles = useCallback(async (files: FileList | File[]): Promise<number> => {
    const list = Array.from(files).filter(
      (f) => f.type.startsWith('audio') || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(f.name),
    );
    if (!list.length) return 0;
    const stamp = Date.now();

    // Reading durations one at a time meant a folder of a hundred songs was a
    // hundred metadata reads in single file, each waiting for the one before it.
    // Six at a time is parallel without opening a hundred decoders at once, and
    // the rows still come out in the order the files were picked. Six is also the
    // size of the pool of probe elements those reads share, so the two numbers
    // cannot drift apart.
    const urls = list.map((file) => URL.createObjectURL(file));
    const durations = new Array<number>(urls.length).fill(0);
    let next = 0;
    const probe = async () => {
      while (next < urls.length) {
        const i = next++;
        durations[i] = await readDuration(urls[i]);
      }
    };
    await Promise.all(Array.from({ length: Math.min(IMPORT_CONCURRENCY, urls.length) }, probe));

    const tracks: Track[] = list.map((file, i) => {
      const palette = IMPORT_PALETTES[i % IMPORT_PALETTES.length];
      return {
        id: `import-${stamp}-${i}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        artist: 'Imported',
        album: 'My Library',
        src: urls[i],
        duration: durations[i],
        palette,
        artwork: coverGradient(palette, (stamp + i) % 900 + 50),
        source: 'import',
      };
    });
    dispatch({ type: 'ADD_TRACKS', tracks });
    return tracks.length;
  }, []);

  // A single, referentially-stable actions object so consumers can safely use
  // it as an effect dependency without re-subscribing every render.
  const actions = useMemo(
    () => ({
      play,
      pause,
      toggle,
      next,
      prev,
      selectTrack,
      seek,
      scrub,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      toggleLike,
      importFiles,
      playNow,
      addTrack,
      refreshLibrary,
      requestLibraryAccess,
      openSystemSettings,
    }),
    [
      play,
      pause,
      toggle,
      next,
      prev,
      selectTrack,
      seek,
      scrub,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      toggleLike,
      importFiles,
      playNow,
      addTrack,
      refreshLibrary,
      requestLibraryAccess,
      openSystemSettings,
    ],
  );

  return { state, engine, currentTrack: state.tracks[state.currentIndex], actions, library };
}
