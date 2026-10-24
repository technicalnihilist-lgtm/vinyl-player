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
