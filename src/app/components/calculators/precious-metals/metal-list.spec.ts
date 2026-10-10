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

describe('isMetalItems', () => {
  it('should accept valid saved lists and reject anything else', () => {
    expect(isMetalItems([ring, bar])).toBe(true);
    expect(isMetalItems([])).toBe(true);
    expect(isMetalItems([{ ...ring, type: 'Mystery' }])).toBe(false);
    expect(isMetalItems([{ ...ring, weight: 0 }])).toBe(false);
    expect(isMetalItems([{ ...ring, note: 5 }])).toBe(false);
    expect(isMetalItems('nope')).toBe(false);
  });
});
