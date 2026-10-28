/**
 * Scarce dates a collector pays well over melt for, so the picker can warn before one is valued as
 * scrap. `mint` is the mark on the coin; `P` stands for Philadelphia's blank (no mint mark).
 */
export interface KeyDate {
  coin: string;
  year: number;
  mint: string;
}

export const KEY_DATES: KeyDate[] = [
  { coin: 'silver-mercury-dime-1916-1945', year: 1916, mint: 'D' },
  { coin: 'silver-mercury-dime-1916-1945', year: 1921, mint: 'P' },
  { coin: 'silver-mercury-dime-1916-1945', year: 1921, mint: 'D' },
  { coin: 'silver-barber-dime-1892-1916', year: 1894, mint: 'S' },
  { coin: 'silver-barber-dime-1892-1916', year: 1895, mint: 'O' },
  { coin: 'silver-barber-quarter-1892-1916', year: 1896, mint: 'S' },
  { coin: 'silver-barber-quarter-1892-1916', year: 1901, mint: 'S' },
  { coin: 'silver-barber-quarter-1892-1916', year: 1913, mint: 'S' },
  { coin: 'silver-standing-liberty-quarter-1916-1930', year: 1916, mint: 'P' },
  { coin: 'silver-standing-liberty-quarter-1916-1930', year: 1927, mint: 'S' },
  { coin: 'silver-washington-quarter-1932-1964', year: 1932, mint: 'D' },
  { coin: 'silver-washington-quarter-1932-1964', year: 1932, mint: 'S' },
  { coin: 'silver-walking-liberty-half-1916-1947', year: 1921, mint: 'P' },
  { coin: 'silver-walking-liberty-half-1916-1947', year: 1921, mint: 'D' },
  { coin: 'silver-walking-liberty-half-1916-1947', year: 1921, mint: 'S' },
  { coin: 'silver-walking-liberty-half-1916-1947', year: 1938, mint: 'D' },
  { coin: 'silver-morgan-dollar-1878-1921', year: 1884, mint: 'S' },
  { coin: 'silver-morgan-dollar-1878-1921', year: 1889, mint: 'CC' },
  { coin: 'silver-morgan-dollar-1878-1921', year: 1892, mint: 'S' },
  { coin: 'silver-morgan-dollar-1878-1921', year: 1893, mint: 'S' },
  { coin: 'silver-morgan-dollar-1878-1921', year: 1893, mint: 'CC' },
  { coin: 'silver-morgan-dollar-1878-1921', year: 1893, mint: 'O' },
  { coin: 'silver-morgan-dollar-1878-1921', year: 1894, mint: 'P' },
  { coin: 'silver-morgan-dollar-1878-1921', year: 1895, mint: 'P' },
  { coin: 'silver-morgan-dollar-1878-1921', year: 1901, mint: 'P' },
  { coin: 'silver-peace-dollar-1921-1935', year: 1921, mint: 'P' },
  { coin: 'silver-peace-dollar-1921-1935', year: 1928, mint: 'P' },
  { coin: 'silver-peace-dollar-1921-1935', year: 1934, mint: 'S' },
  { coin: 'silver-trade-dollar-1873-1885', year: 1878, mint: 'CC' },
  { coin: 'gold-saint-gaudens-double-eagle-20-1907-1933', year: 1927, mint: 'D' },
  { coin: 'gold-indian-head-eagle-10-1907-1933', year: 1920, mint: 'S' },
  { coin: 'gold-indian-head-eagle-10-1907-1933', year: 1933, mint: 'P' },
  { coin: 'gold-indian-head-half-eagle-5-1908-1929', year: 1909, mint: 'O' },
  { coin: 'gold-indian-head-quarter-eagle-2-50-1908-1929', year: 1911, mint: 'D' },
];

const MINT_MARK = /^(p|d|s|o|w|cc)$/;
const DATED = /^(\d{4})-?(p|d|s|o|w|cc)?$/;

/** How the date reads on the coin: `1916-D`, or `1921 (no mint mark)` for Philadelphia. */
export function keyDateLabel(key: KeyDate): string {
  return key.mint === 'P' ? `${key.year} (no mint mark)` : `${key.year}-${key.mint}`;
}

/**
 * A warning shows only when the search names its year, so `mercury` alone isn't buried in them.
 * A typed mint mark has to agree; leaving it out still warns, since the mark is what to check.
 * Every other word has to fit the coin's own text.
 */
export function keyDateMatches(key: KeyDate, coinText: string, words: string[]): boolean {
  let yearSeen = false;
  return words.every(word => {
    const dated = word.match(DATED);
    if (dated) {
      yearSeen = true;
      return Number(dated[1]) === key.year && (!dated[2] || dated[2] === key.mint.toLowerCase());
    }
    if (MINT_MARK.test(word)) {
      return word === key.mint.toLowerCase();
    }
    return coinText.includes(word);
  }) && yearSeen;
}
