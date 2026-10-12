import { COIN_OPTIONS, decodeLegacyStack, findCoin, pureTozPerCoin } from './coin-options';

const morganId = 'silver-morgan-dollar-1878-1921';
const eagleId = 'gold-american-gold-eagle-1-oz-22k';

describe('COIN_OPTIONS', () => {
  it('should hold every gold and silver coin with a unique id', () => {
    const ids = COIN_OPTIONS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(COIN_OPTIONS.some(c => c.metal === 'gold')).toBe(true);
    expect(COIN_OPTIONS.some(c => c.metal === 'silver')).toBe(true);
  });

  it('should use stable slug ids built from metal, name, and dates', () => {
    expect(findCoin(morganId)?.spec.name).toBe('Morgan Dollar');
    expect(findCoin(eagleId)?.spec.name).toBe('American Gold Eagle');
    expect(COIN_OPTIONS.every(c => /^(gold|silver)-[a-z0-9-]+$/.test(c.id))).toBe(true);
  });

  it('should tell the two Kennedy halves apart by year', () => {
    const kennedys = COIN_OPTIONS.filter(c => c.spec.name === 'Kennedy Half Dollar').map(c => c.label);
    expect(kennedys).toEqual(['Kennedy Half Dollar · 1965-1970', 'Kennedy Half Dollar · 1964']);
  });

  it('should compute pure troy ounces from weight and purity', () => {
    // 26.73 g × 0.900 = 24.057 g pure / 31.1035 = 0.77345 oz t.
    expect(pureTozPerCoin(findCoin(morganId)!.spec)).toBeCloseTo(0.77345, 5);
  });
});

describe('legacy coin stack links', () => {
  it('should read pairs, with and without notes', () => {
    expect(decodeLegacyStack(`${morganId}~10~1941%2C%20from%20grandpa%5Fjar_${eagleId}~1`)).toEqual({
      items: [{ id: morganId, quantity: 10, note: '1941, from grandpa_jar' }, { id: eagleId, quantity: 1 }],
      skipped: 0,
    });
  });

  it('should skip unknown coins and bad quantities but keep the rest, and ignore a broken note', () => {
    const decoded = decodeLegacyStack(`${morganId}~3~%E0%A4%A_gold-not-a-coin~1_${eagleId}~0_${eagleId}~1.5_${eagleId}~abc_`);
    expect(decoded).toEqual({ items: [{ id: morganId, quantity: 3 }], skipped: 4 });
  });
});
