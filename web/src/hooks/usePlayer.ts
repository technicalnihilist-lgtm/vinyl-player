import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
import type { Track } from '../types';
import { makeArtwork } from '../utils/artwork';
import { clampTime } from '../utils/format';

const IMPORT_PALETTES: [string, string, string][] = [
  ['#7b2ff7', '#f107a3', '#ffd166'],
  ['#00c6ff', '#0072ff', '#a8ff78'],
  ['#f7971e', '#ffd200', '#ff5f6d'],
  ['#12c2e9', '#c471ed', '#f64f59'],
  ['#43cea2', '#185a9d', '#e0f7fa'],
  ['#8e2de2', '#4a00e0', '#c4b5fd'],
];

/** Read a file's duration from its audio metadata (never guessed). */
function readDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const probe = new Audio();
    probe.preload = 'metadata';
    const finish = (d: number) => {
      probe.removeAttribute('src');
      resolve(d);
    };
    const timer = window.setTimeout(() => finish(0), 8000);
    probe.addEventListener('loadedmetadata', () => {
      window.clearTimeout(timer);
      const d = probe.duration;
      finish(Number.isFinite(d) && d > 0 ? d : 0);
    });
    probe.addEventListener('error', () => {
      window.clearTimeout(timer);
      finish(0);
    });
    probe.src = url;
  });
}

export function usePlayer(initialTracks: Track[] = TRACKS) {
  const [engine] = useState(() => new AudioEngine());
  const [state, dispatch] = useReducer(playerReducer, initialTracks, initState);

  const stateRef = useRef(state);
  stateRef.current = state;
  const loadedIdRef = useRef<string | null>(null);
  const switchingRef = useRef(false);

  const [library, setLibrary] = useState<{ available: boolean; permission: LibraryPermission; scanning: boolean }>(() => ({
    available: hasDeviceLibrary(),
    permission: 'unknown',
    scanning: false,
  }));

  /** Pull the device's music library (Android) into the playlist. */
  const syncLibrary = useCallback(() => {
    if (!hasDeviceLibrary()) return;
    const snapshot = readDeviceLibrary();
    setLibrary({ available: true, permission: snapshot.permission, scanning: snapshot.scanning });
    dispatch({ type: 'SET_LIBRARY', tracks: snapshot.tracks });
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
  useEffect(() => {
    engine.el.volume = state.volume;
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
    const tracks: Track[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const url = URL.createObjectURL(file);
      const duration = await readDuration(url);
      const palette = IMPORT_PALETTES[i % IMPORT_PALETTES.length];
      tracks.push({
        id: `import-${stamp}-${i}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        artist: 'Imported',
        album: 'My Library',
        src: url,
        duration,
        palette,
        artwork: makeArtwork(palette, (stamp + i) % 900 + 50),
        source: 'import',
      });
    }
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
