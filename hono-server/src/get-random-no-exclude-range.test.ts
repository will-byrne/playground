import { describe, expect, it } from "bun:test";
import { getRandomNoExcludeRange } from './get-random-no-exclude-range';

describe('get-random-new-dex-no', () => {
  describe('no excludes', () => {
    it('returns a random number between 1 and 1250', () => {
      const result = getRandomNoExcludeRange([]);

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(1250);
    });

    it('returns a random number between 1 and 5 if 5 is passed in as optional max', () => {
      const result = getRandomNoExcludeRange([], 5);

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(5);
    });
  });

  describe('single exclude', () => {
    it('returns a random number between 1 and 1250 that is not 42 when 42 is excluded', () => {
      const result = getRandomNoExcludeRange([42]);

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(1250);
      expect(result).not.toStrictEqual(42);
    });

    it('returns a random number between 1 and 5 and not 2 if 5 is passed in as optional max and 2 is excluded', () => {
      const result = getRandomNoExcludeRange([2], 5);

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(5);
      expect(result).not.toStrictEqual(2);
    });

    it('returns a random number between 1 and 5 and not 2 if 5 is passed in as optional max and 2 is excluded - loop test', () => {
      const unsortedResult: number[] = [];
      for (let i = 0; i < 30; i++) {
        unsortedResult.push(getRandomNoExcludeRange([2], 5));
      }

      const result = unsortedResult.sort();

      expect(result[0]).toBeGreaterThanOrEqual(1);
      expect(result[29]).toBeLessThanOrEqual(5);
      expect(result).not.toContain(2);
    });
  });

  describe('multiple exclude', () => {
    it('returns a random number between 1 and 1250 that is not 1, 42, or 500 when they are excluded', () => {
      const result = getRandomNoExcludeRange([1, 42, 500]);

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(1250);
      expect(result).not.toStrictEqual(1);
      expect(result).not.toStrictEqual(42);
      expect(result).not.toStrictEqual(500);
    });

    it('returns a random number between 1 and 5 and not 2 or 4 if 5 is passed in as optional max and 2 and 4 are excluded', () => {
      const result = getRandomNoExcludeRange([2, 4], 5);

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(5);
      expect(result).not.toStrictEqual(2);
    });

    it('returns a random number between 1 and 5 and not 2 or 4 if 5 is passed in as optional max and 2 and 4 are excluded - loop test', () => {
      const unsortedResult: number[] = [];
      for (let i = 0; i < 30; i++) {
        unsortedResult.push(getRandomNoExcludeRange([2, 4], 5));
      }

      const result = unsortedResult.sort();

      expect(result[0]).toBeGreaterThanOrEqual(1);
      expect(result[29]).toBeLessThanOrEqual(5);
      expect(result).not.toContain(2);
      expect(result).not.toContain(4);
    });

    it('returns 3 if 5 is passed in as optional max and 1, 2, 4, and 5 are excluded', () => {
      const result = getRandomNoExcludeRange([1, 2, 4, 5], 5);

      expect(result).toStrictEqual(3);
    });
  });
});
