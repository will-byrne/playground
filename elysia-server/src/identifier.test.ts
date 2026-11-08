import { describe, expect, it } from 'bun:test';
import { MAX_IDENTIFIER_LEN, normalizeIdentifier } from './identifier';

describe('normalizeIdentifier', () => {
  it.each([
    ['25', '25'],
    ['pikachu', 'pikachu'],
    [' Mr-Mime ', 'mr-mime'],
    ['-1', '-1'],
  ])('accepts %p as %p', (raw, want) => {
    expect(normalizeIdentifier(raw)).toBe(want);
  });

  it.each(['', ' ', '..', 'a b', '1.5', '+5', '\u0084', '\u0013', 'pokémon', 'a'.repeat(MAX_IDENTIFIER_LEN + 1)])(
    'rejects %p',
    (raw) => {
      expect(normalizeIdentifier(raw)).toBeUndefined();
    },
  );
});
