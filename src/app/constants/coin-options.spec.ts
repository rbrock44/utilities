import { COIN_OPTIONS, coinStruckAt, coinStruckIn, decodeLegacyStack, findCoin, pureTozPerCoin } from './coin-options';

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

  it('should tell the Kennedy halves apart by year and mint', () => {
    const kennedys = COIN_OPTIONS.filter(c => c.spec.name === 'Kennedy Half Dollar').map(c => c.label);
    expect(kennedys).toEqual([
      'Kennedy Half Dollar · 1965-1970',
      'Kennedy Half Dollar · 1964',
      'Kennedy Half Dollar · 1976 S (40% silver)',
      'Kennedy Half Dollar · 1992-2018 S (silver proof)',
      'Kennedy Half Dollar · 2019+ S (silver proof)',
    ]);
  });

  it('should read the years struck from each description', () => {
    const years = (name: string) => COIN_OPTIONS.find(c => c.spec.name === name)!.years;
    expect(years('Mercury Dime')).toEqual({ from: 1916, to: 1945 });
    expect(years('Roosevelt Dime')).toEqual({ from: 1946, to: 1964 });
    expect(years('British Crown')).toEqual({ to: 1946 });
    expect(findCoin('silver-roosevelt-dime-2019-s-silver-proof')!.years).toEqual({ from: 2019 });
    expect(findCoin('silver-eisenhower-dollar-1971-1976-s-40-silver')!.years).toEqual({ from: 1971, to: 1976 });
    expect(COIN_OPTIONS.find(c => c.spec.description === '30g (2016+)')!.years).toEqual({ from: 2016 });
    expect(findCoin(morganId)!.years).toEqual({ from: 1878, to: 1921 });
    expect(findCoin(eagleId)!.years).toBeUndefined();
    expect(COIN_OPTIONS.filter(c => c.spec.description === '1000 toz').every(c => !c.years)).toBe(true);
  });

  it('should match a year inside a coin\'s range, including open ends', () => {
    const morgan = findCoin(morganId)!;
    expect(coinStruckIn(morgan, 1878)).toBe(true);
    expect(coinStruckIn(morgan, 1921)).toBe(true);
    expect(coinStruckIn(morgan, 1922)).toBe(false);
    expect(coinStruckIn(COIN_OPTIONS.find(c => c.spec.name === 'Roosevelt Dime')!, 1950)).toBe(true);
    expect(coinStruckIn(findCoin(eagleId)!, 2000)).toBe(false);
  });

  it('should limit a coin to the mints that struck it in silver', () => {
    const ike = findCoin('silver-eisenhower-dollar-1971-1976-s-40-silver')!;
    expect(coinStruckAt(ike, 's')).toBe(true);
    expect(coinStruckAt(ike, 'd')).toBe(false);
    expect(coinStruckAt(findCoin(morganId)!, 'cc')).toBe(true);
  });

  it('should still find coins saved under their old, less specific ids', () => {
    expect(findCoin('silver-eisenhower-dollar-1971-1976-40-silver')?.id).toBe('silver-eisenhower-dollar-1971-1976-s-40-silver');
    expect(findCoin('silver-roosevelt-dime-pre-1965')?.id).toBe('silver-roosevelt-dime-1946-1964');
    expect(findCoin('silver-washington-quarter-pre-1965')?.id).toBe('silver-washington-quarter-1932-1964');
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
