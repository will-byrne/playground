import { describe, expect, test } from 'bun:test';
import { getRandomUnseenDexNo } from './get-random-unseen-dex-no';

describe('get-random-unseen-dex-no', () => {
  test('returns a number within the valid dex range', () => {
    const result = getRandomUnseenDexNo([]);

    expect(result > 0).toBeTrue();
    expect(result <= 1024).toBeTrue();
  });

  test('returns a number that is not in the exclude list', () => {
    const result = getRandomUnseenDexNo([1, 3, 5, 7, 9]);

    expect(result).not.toBeNull();
    expect([1, 3, 5, 7, 9]).not.toContain(result);
  });

  test('throws when the excluded range covers every value', () => {
    // The full range is 1..1024; excluding it all must raise an error.
    expect(() => getRandomUnseenDexNo(Array.from({ length: 1024 }, (_, i) => i + 1)))
      .toThrow('No available dex numbers');
  });

  test('does not treat duplicate exclusions as exhausting the range', () => {
    // 1 is listed nine times but only 1 and 9 are unique, leaving 8 free.
    // Duplicates must not inflate the exclusion count enough to raise a
    // false "no available dex numbers" error.
    const result = getRandomUnseenDexNo([1, 1, 1, 1, 1, 1, 1, 1, 1, 9]);

    expect(result).toBeTypeOf('number');
    expect([1, 9]).not.toContain(result);
  });

  test('ignores out-of-range exclusions when counting the range', () => {
    // Only 1-9 are in range; 1000000 is ignored, leaving room to pick.
    const result = getRandomUnseenDexNo([1, 2, 3, 4, 5, 6, 7, 8, 9, 1000000]);

    expect(result).toBeTypeOf('number');
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 1000000]).not.toContain(result);
  });

  test('ignores non-finite exclusions', () => {
    const result = getRandomUnseenDexNo([1, NaN, Infinity, -3]);

    expect(result).not.toBeNull();
    expect([1]).not.toContain(result);
  });

  test('terminates even when almost the entire range is excluded', () => {
    // 1024 of the 1024 ids excluded leaves exactly one free slot.
    const excluded = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const result = getRandomUnseenDexNo(excluded);

    expect(result).toBeTypeOf('number');
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9]).not.toContain(result);
  });
});
