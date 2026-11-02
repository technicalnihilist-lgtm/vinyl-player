import { describe, expect, it } from 'vitest';
import { parseLikes, serializeLikes } from './likes';

describe('parseLikes()', () => {
  it('reads a stored set of likes', () => {
    expect(parseLikes('{"device-41":true,"device-42":true}')).toEqual({
      'device-41': true,
      'device-42': true,
    });
  });

  it('round-trips through serializeLikes()', () => {
    const likes = { a: true, b: false, c: true };
    expect(parseLikes(serializeLikes(likes))).toEqual({ a: true, c: true });
  });

  it('stores only the liked ids', () => {
    expect(serializeLikes({ a: true, b: false })).toBe('{"a":true}');
  });

  it('survives a corrupted store', () => {
    expect(parseLikes('not json at all')).toEqual({});
    expect(parseLikes('')).toEqual({});
    expect(parseLikes(null)).toEqual({});
    expect(parseLikes('[]')).toEqual({});
    expect(parseLikes('"a string"')).toEqual({});
  });

  it('ignores entries that are not a real like', () => {
    expect(parseLikes('{"a":false,"b":"true","c":1,"d":null,"e":true}')).toEqual({ e: true });
  });

  it('drops an empty id', () => {
    expect(parseLikes('{"":true,"a":true}')).toEqual({ a: true });
  });
});
