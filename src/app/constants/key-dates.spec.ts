import { findCoin } from './coin-options';
import { KEY_DATES, keyDateLabel, keyDateMatches } from './key-dates';

describe('KEY_DATES', () => {
  it('should point every key date at a real coin struck that year', () => {
    for (const key of KEY_DATES) {
      const coin = findCoin(key.coin);
      expect(coin, key.coin).toBeDefined();
      expect(coin!.years!.from! <= key.year && key.year <= coin!.years!.to!, `${key.coin} ${key.year}`).toBe(true);
    }
  });

  it('should label Philadelphia as no mint mark', () => {
    expect(keyDateLabel({ coin: 'x', year: 1916, mint: 'D' })).toBe('1916-D');
    expect(keyDateLabel({ coin: 'x', year: 1921, mint: 'P' })).toBe('1921 (no mint mark)');
  });

  it('should only match when the year is typed and any mint mark agrees', () => {
    const key = { coin: 'x', year: 1916, mint: 'D' };
    const text = 'silver mercury dime · 1916-1945';
    expect(keyDateMatches(key, text, ['1916', 'mercury'])).toBe(true);
    expect(keyDateMatches(key, text, ['1916', 'd', 'mercury'])).toBe(true);
    expect(keyDateMatches(key, text, ['1916d'])).toBe(true);
    expect(keyDateMatches(key, text, ['mercury'])).toBe(false);
    expect(keyDateMatches(key, text, ['1916', 's'])).toBe(false);
    expect(keyDateMatches(key, text, ['1917', 'mercury'])).toBe(false);
    expect(keyDateMatches(key, text, ['1916', 'morgan'])).toBe(false);
  });
});
