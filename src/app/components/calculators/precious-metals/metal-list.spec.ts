import { decodeMetalList, decodeSpotPrices, encodeMetalList, encodeSpotPrices, isMetalItems, MetalListItem } from './metal-list';
import { METAL_UNITS } from '../../../constants/constants';

const ring: MetalListItem = { metal: 'gold', type: '14K Gold (58.3%)', weight: 4.2, unit: 'grams', note: 'nugget ring' };
const chain: MetalListItem = { metal: 'gold', type: '10K Gold (41.7%)', weight: 12, unit: 'grams' };
const bar: MetalListItem = { metal: 'silver', type: 'Fine Silver (99.9%)', weight: 1, unit: 'toz', note: 'Sterling ~ "bar" & co_1 ✓' };

describe('metal list links', () => {
  it('should round-trip rows with and without notes', () => {
    const encoded = encodeMetalList([ring, chain, bar]);
    expect(decodeMetalList(encoded)).toEqual({ items: [ring, chain, bar], skipped: 0 });
  });

  it('should round-trip every weight unit', () => {
    const items: MetalListItem[] = METAL_UNITS.map(unit => ({ ...chain, unit: unit.id }));
    expect(decodeMetalList(encodeMetalList(items))).toEqual({ items, skipped: 0 });
  });

  it('should produce a link-safe value even with unicode and symbols in notes', () => {
    const encoded = encodeMetalList([bar]);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('should skip rows with unknown types, bad weights, or bad units but keep the rest', () => {
    const tampered = btoa(JSON.stringify([
      ['g', '14K Gold (58.3%)', 4.2, 'g', 'nugget ring'],
      ['g', '99K Unobtainium', 1, 'g'],
      ['s', 'Fine Silver (99.9%)', -3, 'g'],
      ['s', 'Fine Silver (99.9%)', 1, 'stone'],
      ['x', 'Fine Silver (99.9%)', 1, 'g'],
      'not a row',
    ]));

    expect(decodeMetalList(tampered)).toEqual({ items: [ring], skipped: 5 });
  });

  it('should treat a garbled link as one unreadable entry', () => {
    expect(decodeMetalList('%%%not-base64')).toEqual({ items: [], skipped: 1 });
    expect(decodeMetalList(btoa('{"not":"a list"}'))).toEqual({ items: [], skipped: 1 });
  });

  it('should drop blank notes when decoding', () => {
    const encoded = btoa(JSON.stringify([['g', '10K Gold (41.7%)', 12, 'g', '   ']]));
    expect(decodeMetalList(encoded).items).toEqual([chain]);
  });
});

describe('custom percents in links', () => {
  const odd: MetalListItem = { metal: 'silver', type: 'Custom %', purity: 70, weight: 20, unit: 'grams', note: 'old bracelet' };

  it('should round-trip a custom percent as a number in the type slot', () => {
    const encoded = encodeMetalList([odd]);
    const raw = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));

    expect(raw).toEqual([['s', 70, 20, 'g', 'old bracelet']]);
    expect(decodeMetalList(encoded).items).toEqual([odd]);
  });

  it('should carry custom gold the same way', () => {
    const scrap: MetalListItem = { metal: 'gold', type: 'Custom %', purity: 62.5, weight: 3.1, unit: 'grams' };
    const encoded = encodeMetalList([scrap]);

    expect(JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')))).toEqual([['g', 62.5, 3.1, 'g']]);
    expect(decodeMetalList(encoded).items).toEqual([scrap]);
  });

  it('should reject custom percents out of range', () => {
    const tampered = btoa(JSON.stringify([['s', 0, 1, 'g'], ['s', 101, 1, 'g'], ['g', -5, 1, 'g'], ['s', 60, 1, 'g']]));
    expect(decodeMetalList(tampered)).toEqual({
      items: [{ metal: 'silver', type: 'Custom %', purity: 60, weight: 1, unit: 'grams' }],
      skipped: 3,
    });
  });
});

describe('isMetalItems', () => {
  it('should accept valid saved lists and reject anything else', () => {
    expect(isMetalItems([ring, bar])).toBe(true);
    expect(isMetalItems([])).toBe(true);
    expect(isMetalItems([{ ...ring, type: 'Mystery' }])).toBe(false);
    expect(isMetalItems([{ ...ring, weight: 0 }])).toBe(false);
    expect(isMetalItems([{ ...ring, note: 5 }])).toBe(false);
    expect(isMetalItems('nope')).toBe(false);
    expect(isMetalItems([{ ...bar, type: 'Custom %', purity: 65 }])).toBe(true);
    expect(isMetalItems([{ ...ring, type: 'Custom %', purity: 62.5 }])).toBe(true);
    expect(isMetalItems([{ ...bar, type: 'Custom %' }])).toBe(false);
    expect(isMetalItems([{ ...bar, purity: 65 }])).toBe(false);
  });
});

describe('spot prices in links', () => {
  const at = new Date('2026-10-10T21:10:00Z');

  it('should round-trip prices and the time they were taken', () => {
    const text = encodeSpotPrices({ gold: 3985.4, silver: 48.12, timestamp: at });

    expect(text).toBe(`3985.4_48.12_${at.getTime()}`);
    expect(decodeSpotPrices(text)).toEqual({ gold: 3985.4, silver: 48.12, timestamp: at });
  });

  it('should leave prices out until both are known', () => {
    expect(encodeSpotPrices({ gold: -1, silver: -1, timestamp: at })).toBeNull();
    expect(encodeSpotPrices({ gold: 2000, silver: 0, timestamp: at })).toBeNull();
  });

  it('should ignore missing or damaged prices', () => {
    expect(decodeSpotPrices(null)).toBeNull();
    expect(decodeSpotPrices('')).toBeNull();
    expect(decodeSpotPrices('2000_25')).toBeNull();
    expect(decodeSpotPrices('2000__1')).toBeNull();
    expect(decodeSpotPrices('abc_25_1')).toBeNull();
    expect(decodeSpotPrices('-5_25_1')).toBeNull();
    expect(decodeSpotPrices('2000_25_soon')).toBeNull();
  });
});

describe('coins in links', () => {
  const morgans = { coin: 'silver-morgan-dollar-1878-1921', quantity: 10, note: 'from grandpa' };
  const eagle = { coin: 'gold-american-gold-eagle-1-oz-22k', quantity: 1 };

  it('should round-trip coins next to weighed pieces', () => {
    const encoded = encodeMetalList([ring, morgans, eagle]);
    const raw = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));

    expect(raw[1]).toEqual(['c', morgans.coin, 10, 'from grandpa']);
    expect(raw[2]).toEqual(['c', eagle.coin, 1]);
    expect(decodeMetalList(encoded)).toEqual({ items: [ring, morgans, eagle], skipped: 0 });
  });

  it('should skip unknown coins and bad counts', () => {
    const tampered = btoa(JSON.stringify([
      ['c', 'silver-not-a-coin', 1],
      ['c', morgans.coin, 0],
      ['c', morgans.coin, 1.5],
      ['c', morgans.coin, '2'],
      ['c', eagle.coin, 1, '  '],
    ]));
    expect(decodeMetalList(tampered)).toEqual({ items: [eagle], skipped: 4 });
  });

  it('should accept saved lists that mix pieces and coins', () => {
    expect(isMetalItems([ring, morgans])).toBe(true);
    expect(isMetalItems([{ ...morgans, coin: 'nope' }])).toBe(false);
    expect(isMetalItems([{ ...morgans, note: 3 }])).toBe(false);
  });
});
