import { decodeMetalList, encodeMetalList, isMetalItems, MetalListItem } from './metal-list';

const ring: MetalListItem = { metal: 'gold', type: '14K Gold (58.3%)', weight: 4.2, unit: 'grams', note: 'nugget ring' };
const chain: MetalListItem = { metal: 'gold', type: '10K Gold (41.7%)', weight: 12, unit: 'grams' };
const bar: MetalListItem = { metal: 'silver', type: 'Fine Silver (99.9%)', weight: 1, unit: 'toz', note: 'Sterling ~ "bar" & co_1 ✓' };

describe('metal list links', () => {
  it('should round-trip rows with and without notes', () => {
    const encoded = encodeMetalList([ring, chain, bar]);
    expect(decodeMetalList(encoded)).toEqual({ items: [ring, chain, bar], skipped: 0 });
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
      ['s', 'Fine Silver (99.9%)', 1, 'kg'],
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

describe('custom silver in links', () => {
  const odd: MetalListItem = { metal: 'silver', type: 'Custom %', purity: 70, weight: 20, unit: 'grams', note: 'old bracelet' };

  it('should round-trip a custom percent as a number in the type slot', () => {
    const encoded = encodeMetalList([odd]);
    const raw = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));

    expect(raw).toEqual([['s', 70, 20, 'g', 'old bracelet']]);
    expect(decodeMetalList(encoded).items).toEqual([odd]);
  });

  it('should reject custom percents out of range and custom gold', () => {
    const tampered = btoa(JSON.stringify([['s', 0, 1, 'g'], ['s', 101, 1, 'g'], ['g', 70, 1, 'g'], ['s', 60, 1, 'g']]));
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
    expect(isMetalItems([{ ...bar, type: 'Custom %' }])).toBe(false);
    expect(isMetalItems([{ ...bar, purity: 65 }])).toBe(false);
  });
});
