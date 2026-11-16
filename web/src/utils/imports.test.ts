import { describe, expect, it } from 'vitest';
import { freshFiles, importKey, importedKeys } from './imports';

const file = (name: string, size: number, lastModified: number) => ({ name, size, lastModified });

const FOLDER = [file('Kesariya.mp3', 8_000_000, 1_700_000_000_000), file('Tum Hi Ho.mp3', 9_000_000, 1_700_000_001_000)];

describe('importKey', () => {
  it('is the same for the same file picked twice', () => {
    expect(importKey(file('a.mp3', 10, 5))).toBe(importKey(file('a.mp3', 10, 5)));
  });

  it('separates files that differ in name, size or date', () => {
    expect(importKey(file('a.mp3', 10, 5))).not.toBe(importKey(file('b.mp3', 10, 5)));
    expect(importKey(file('a.mp3', 11, 5))).not.toBe(importKey(file('a.mp3', 10, 5)));
    expect(importKey(file('a.mp3', 10, 6))).not.toBe(importKey(file('a.mp3', 10, 5)));
  });
});

describe('importedKeys', () => {
  it('collects only the songs that were imported', () => {
    const keys = importedKeys([
      { importKey: 'a.mp3|1|2' },
      { importKey: 'b.mp3|3|4' },
      {},
      { importKey: undefined },
    ]);
    expect([...keys].sort()).toEqual(['a.mp3|1|2', 'b.mp3|3|4']);
  });
});

describe('freshFiles', () => {
  it('keeps everything the first time', () => {
    expect(freshFiles(FOLDER, new Set())).toHaveLength(2);
  });

  it('drops a folder that is picked again', () => {
    const known = importedKeys([]);
    expect(freshFiles(FOLDER, known)).toHaveLength(2);
    // The second pick of the same folder adds nothing, and costs no read.
    expect(freshFiles(FOLDER, known)).toHaveLength(0);
  });

  it('keeps only the one file that is new', () => {
    const known = importedKeys([{ importKey: importKey(FOLDER[0]) }]);
    const fresh = freshFiles([...FOLDER, file('New.mp3', 1, 1)], known);
    expect(fresh.map((f) => f.name)).toEqual(['Tum Hi Ho.mp3', 'New.mp3']);
  });

  it('keeps one copy of a file that appears twice in one pick', () => {
    const twice = [FOLDER[0], FOLDER[0]];
    expect(freshFiles(twice, new Set())).toHaveLength(1);
  });
});
