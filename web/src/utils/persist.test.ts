import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstRun, persistSoon, type KeyValueStore } from './persist';

function fakeStore(): KeyValueStore & { writes: string[] } {
  const writes: string[] = [];
  return {
    writes,
    getItem: () => null,
    setItem: (_key: string, value: string) => {
      writes.push(value);
    },
  };
}

describe('persistSoon()', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('writes nothing until the delay has passed', () => {
    const store = fakeStore();
    persistSoon('k', { a: 1 }, 250, store);
    vi.advanceTimersByTime(249);
    expect(store.writes).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(store.writes).toEqual(['{"a":1}']);
  });

  it('writes once for a burst of changes', () => {
    const store = fakeStore();
    let cancel = persistSoon('k', 1, 250, store);
    cancel();
    cancel = persistSoon('k', 2, 250, store);
    cancel();
    cancel = persistSoon('k', 3, 250, store);
    vi.advanceTimersByTime(500);
    expect(store.writes).toEqual(['3']);
  });

  it('a cancelled write never happens', () => {
    const store = fakeStore();
    const cancel = persistSoon('k', 1, 250, store);
    cancel();
    vi.advanceTimersByTime(1000);
    expect(store.writes).toHaveLength(0);
  });

  it('survives a store that refuses to write', () => {
    const store: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => {
      persistSoon('k', 1, 0, store);
      vi.advanceTimersByTime(1);
    }).not.toThrow();
  });

  it('does nothing at all without a store', () => {
    expect(() => {
      persistSoon('k', 1, 0, null);
      vi.advanceTimersByTime(1);
    }).not.toThrow();
  });
});

describe('firstRun()', () => {
  it('is true once and false afterwards', () => {
    const seen = { current: false };
    expect(firstRun(seen)).toBe(true);
    expect(firstRun(seen)).toBe(false);
    expect(firstRun(seen)).toBe(false);
  });
});
