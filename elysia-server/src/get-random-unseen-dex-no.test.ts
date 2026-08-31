import { describe, expect, test } from 'bun:test';
import { getRandomUnseenDexNo } from './get-random-unseen-dex-no';

describe('get-random-unseen-dex-no', () => {
  test('returns a random number', () => {
    const result = getRandomUnseenDexNo([]);

    expect(result > 0).toBeTrue();
    expect(result <= 1025).toBeTrue();
  });

  test('returns a random nuber under the optional limit', () => {
    const result = getRandomUnseenDexNo([], 1);

    expect(result).toBe(1);
  });

  test('returns a random number that is not in the exclude list', () => {
    const result = getRandomUnseenDexNo([1, 3, 5, 7, 9], 10);

    expect(result % 2).toBe(0);
  });
});
