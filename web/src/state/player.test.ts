import { describe, expect, it } from 'vitest';
import type { Track } from '../types';
import { initState, playerReducer, shuffled, step, type PlayerState } from './player';

const mk = (n: number): Track[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    title: `Track ${i}`,
    artist: 'A',
    album: 'B',
    src: `t${i}.mp3`,
    duration: 100 + i,
    artwork: '',
    palette: ['#000', '#111', '#222'] as [string, string, string],
  }));

const base = (n = 3, over: Partial<PlayerState> = {}): PlayerState => ({ ...initState(mk(n)), ...over });

describe('shuffled()', () => {
  it('keeps every index exactly once', () => {
    const r = shuffled(10, () => 0.42);
    expect([...r].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it('places the requested index first', () => {
    expect(shuffled(6, Math.random, 4)[0]).toBe(4);
  });
});

describe('step()', () => {
  it('advances forward and wraps with repeat=all', () => {
    const s = base(3, { currentIndex: 2, repeat: 'all' });
    expect(step(s, 1, true).index).toBe(0);
  });
  it('stops at the end when repeat=off and the track ended', () => {
    const s = base(3, { currentIndex: 2, repeat: 'off' });
    expect(step(s, 1, true)).toEqual({ index: 2, stop: true, replay: false });
  });
  it('replays the same track when repeat=one', () => {
    const s = base(3, { currentIndex: 1, repeat: 'one' });
    expect(step(s, 1, true)).toEqual({ index: 1, stop: false, replay: true });
  });
  it('restarts the current track when going prev at the start', () => {
    const s = base(3, { currentIndex: 0, repeat: 'off' });
    expect(step(s, -1, false).index).toBe(0);
  });
  it('follows the shuffle order when shuffle is on', () => {
    const s = base(4, { shuffle: true, order: [2, 0, 3, 1], currentIndex: 2 });
    expect(step(s, 1, false).index).toBe(0);
    expect(step(s, 1, true).index).toBe(0);
  });
});

describe('an action that changes nothing keeps the same state', () => {
  // The element repeats itself: a track change reports one duration twice, and a
  // seek is followed by a timeupdate at the place it sought to. Returning the same
  // object is what lets React skip the render.
  it('SET_TIME at the position it already has', () => {
    const s = base(3, { currentTime: 12.5 });
    expect(playerReducer(s, { type: 'SET_TIME', time: 12.5 })).toBe(s);
    expect(playerReducer(s, { type: 'SET_TIME', time: 12.6 }).currentTime).toBe(12.6);
  });

  it('SET_DURATION with the duration it already has', () => {
    const s = base(3, { duration: 101 });
    expect(playerReducer(s, { type: 'SET_DURATION', duration: 101 })).toBe(s);
    expect(playerReducer(s, { type: 'SET_DURATION', duration: 240 }).duration).toBe(240);
  });

  it('SET_STATUS repeating itself', () => {
    const s = base(3, { status: 'playing', error: null });
    expect(playerReducer(s, { type: 'SET_STATUS', status: 'playing' })).toBe(s);
    const failed = base(3, { status: 'error', error: 'Playback failed.' });
    expect(playerReducer(failed, { type: 'SET_STATUS', status: 'error', error: 'Playback failed.' })).toBe(failed);
    expect(playerReducer(failed, { type: 'SET_STATUS', status: 'error', error: 'Something else.' }).error).toBe(
      'Something else.',
    );
  });

  it('SET_VOLUME at the volume it already has — unless it was muted', () => {
    const s = base(3, { volume: 0.5, muted: false });
    expect(playerReducer(s, { type: 'SET_VOLUME', volume: 0.5 })).toBe(s);
    const muted = base(3, { volume: 0.5, muted: true });
    const unmuted = playerReducer(muted, { type: 'SET_VOLUME', volume: 0.5 });
    expect(unmuted).not.toBe(muted);
    expect(unmuted.muted).toBe(false);
  });
});

describe('the play order is only built when it is used', () => {
  // With shuffle off the order is the library order, index for index, so an array
  // of it is an array of the numbers 0..n-1 — five thousand entries on a full
  // phone, allocated on every rescan and every import to say nothing.
  it('starts empty, because the order is the index', () => {
    expect(initState(mk(500)).order).toEqual([]);
  });

  it('is built the moment shuffle is turned on', () => {
    const s = playerReducer(base(5), { type: 'TOGGLE_SHUFFLE' });
    expect([...s.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it('stays empty when tracks are added with shuffle off', () => {
    const s = playerReducer(base(3), { type: 'ADD_TRACKS', tracks: mk(5).slice(3) });
    expect(s.tracks).toHaveLength(5);
    expect(s.order).toEqual([]);
  });

  it('grows by exactly the new tracks when shuffle is on', () => {
    const shuffledState = playerReducer(base(3), { type: 'TOGGLE_SHUFFLE' });
    const s = playerReducer(shuffledState, { type: 'ADD_TRACKS', tracks: mk(5).slice(3) });
    expect(s.tracks).toHaveLength(5);
    expect([...s.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it('is left alone by a rescan with shuffle off, and rebuilt with shuffle on', () => {
    const off = playerReducer(base(3), { type: 'SET_LIBRARY', tracks: mk(4) });
    expect(off.order).toEqual([]);
    const on = playerReducer(playerReducer(base(3), { type: 'TOGGLE_SHUFFLE' }), {
      type: 'SET_LIBRARY',
      tracks: mk(4),
    });
    expect([...on.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });
});

describe('playerReducer track transitions', () => {
  it('resets time and duration when the index changes', () => {
    let s = base(3, { currentTime: 55 });
    s = playerReducer(s, { type: 'SET_INDEX', index: 1, autoplay: true });
    expect(s.currentIndex).toBe(1);
    expect(s.currentTime).toBe(0);
    expect(s.duration).toBe(101);
    expect(s.isPlaying).toBe(true);
  });
  it('ignores an out-of-range index', () => {
    const s = base(3);
    expect(playerReducer(s, { type: 'SET_INDEX', index: 9, autoplay: true })).toBe(s);
  });
  it('does not restart the same track on a duplicate selection with the same intent', () => {
    const s = base(3, { currentIndex: 1, isPlaying: true });
    expect(playerReducer(s, { type: 'SET_INDEX', index: 1, autoplay: true })).toBe(s);
  });
  it('advances to the next track on ENDED', () => {
    const s = playerReducer(base(3, { currentIndex: 0, isPlaying: true }), { type: 'ENDED' });
    expect(s.currentIndex).toBe(1);
    expect(s.isPlaying).toBe(true);
    expect(s.currentTime).toBe(0);
  });
  it('replays via a nonce bump on ENDED with repeat=one', () => {
    const before = base(3, { currentIndex: 1, repeat: 'one', isPlaying: true, nonce: 5 });
    const s = playerReducer(before, { type: 'ENDED' });
    expect(s.currentIndex).toBe(1);
    expect(s.nonce).toBe(6);
    expect(s.isPlaying).toBe(true);
  });
  it('stops at the end of the list with repeat=off', () => {
    const s = playerReducer(base(3, { currentIndex: 2, repeat: 'off', isPlaying: true, duration: 102 }), { type: 'ENDED' });
    expect(s.isPlaying).toBe(false);
    expect(s.status).toBe('paused');
    expect(s.currentIndex).toBe(2);
  });
  it('cycles repeat modes off → all → one → off', () => {
    let s = base(3);
    s = playerReducer(s, { type: 'CYCLE_REPEAT' });
    expect(s.repeat).toBe('all');
    s = playerReducer(s, { type: 'CYCLE_REPEAT' });
    expect(s.repeat).toBe('one');
    s = playerReducer(s, { type: 'CYCLE_REPEAT' });
    expect(s.repeat).toBe('off');
  });
  it('keeps the current track first when shuffle is enabled', () => {
    const s = playerReducer(base(5, { currentIndex: 3 }), { type: 'TOGGLE_SHUFFLE' });
    expect(s.shuffle).toBe(true);
    expect(s.order[0]).toBe(3);
    expect([...s.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('step() with shuffle', () => {
  // The position is read from a cached map instead of scanning the order. This
  // checks it against the scan over orders of every size, from every position, in
  // both directions — including an index that is not in the order at all.
  const scanStep = (state: PlayerState, dir: 1 | -1, atEnd: boolean) => {
    // The two early answers step() gives before it walks the order at all.
    if (state.tracks.length === 1) {
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
    const order = state.order;
    const pos = order.indexOf(state.currentIndex);
    let nextPos = pos + dir;
    if (nextPos >= order.length) {
      if (state.repeat === 'all') nextPos = 0;
      else if (atEnd) return { index: state.currentIndex, stop: true, replay: false };
      else nextPos = order.length - 1;
    }
    if (nextPos < 0) nextPos = state.repeat === 'all' ? order.length - 1 : 0;
    return { index: order[nextPos], stop: false, replay: false };
  };

  it('agrees with scanning the order, for every case', () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (const n of [2, 3, 4, 7]) {
      const order = shuffled(n, rand);
      for (const currentIndex of [...order, 99]) {
        for (const repeat of ['off', 'all', 'one'] as const) {
          for (const dir of [1, -1] as const) {
            for (const atEnd of [false, true]) {
              const state = base(n, { shuffle: true, order, currentIndex, repeat });
              expect(step(state, dir, atEnd)).toEqual(scanStep(state, dir, atEnd));
            }
          }
        }
      }
    }
  });

  it('finds the same position after the order has been used once already', () => {
    const order = [4, 0, 3, 1, 2];
    const state = base(5, { shuffle: true, order, currentIndex: 3, repeat: 'all' });
    expect(step(state, 1, false).index).toBe(1);
    expect(step(state, 1, false).index).toBe(1);
    expect(step(state, -1, false).index).toBe(0);
  });
});

describe('step() without shuffle', () => {
  // The play order is the library order, so the neighbour must be readable
  // straight off the index. This checks the shortcut against the long way —
  // build the whole order, then walk it — over every combination that matters.
  const slowStep = (state: PlayerState, dir: 1 | -1, atEnd: boolean) => {
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
    const order = Array.from({ length: total }, (_, i) => i);
    const pos = order.indexOf(state.currentIndex);
    let nextPos = pos + dir;
    if (nextPos >= order.length) {
      if (state.repeat === 'all') nextPos = 0;
      else if (atEnd) return { index: state.currentIndex, stop: true, replay: false };
      else nextPos = order.length - 1;
    }
    if (nextPos < 0) nextPos = state.repeat === 'all' ? order.length - 1 : 0;
    return { index: order[nextPos], stop: false, replay: false };
  };

  it('agrees with walking the built order, for every case', () => {
    for (const n of [0, 1, 2, 3, 5]) {
      for (const currentIndex of [0, 1, 2, 4]) {
        for (const repeat of ['off', 'all', 'one'] as const) {
          for (const dir of [1, -1] as const) {
            for (const atEnd of [false, true]) {
              const state = base(n, { currentIndex: Math.min(currentIndex, Math.max(0, n - 1)), repeat });
              expect(step(state, dir, atEnd)).toEqual(slowStep(state, dir, atEnd));
            }
          }
        }
      }
    }
  });

  it('still walks the shuffled order when shuffle is on', () => {
    const state = base(4, { shuffle: true, order: [2, 0, 3, 1], currentIndex: 2 });
    expect(step(state, 1, false).index).toBe(0);
    // First in the shuffled order, repeat off: there is nowhere before it.
    expect(step(state, -1, false).index).toBe(2);
    expect(step(base(4, { shuffle: true, order: [2, 0, 3, 1], currentIndex: 2, repeat: 'all' }), -1, false).index).toBe(1);
  });
});
