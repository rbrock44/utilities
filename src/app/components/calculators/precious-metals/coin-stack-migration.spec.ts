import { SavedListStore } from '../../../services/saved-lists';
import { COIN_STACK_KEY, migrateCoinStacks } from './coin-stack-migration';
import { isMetalItems, MetalListEntry } from './metal-list';

describe('migrateCoinStacks', () => {
  let store: Record<string, string>;
  const morgan = 'silver-morgan-dollar-1878-1921';
  const eagle = 'gold-american-gold-eagle-1-oz-22k';
  const lists = () => new SavedListStore<MetalListEntry[]>('utilities-metal-lists', isMetalItems);

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should move saved stacks into metal lists, newest first, and remove the old ones', () => {
    store[COIN_STACK_KEY] = JSON.stringify([
      { name: 'Newer', items: [{ id: eagle, quantity: 1 }], savedAt: '2026-10-02T00:00:00.000Z' },
      { name: 'Jar', items: [{ id: morgan, quantity: 10, note: ' from grandpa ' }], savedAt: '2026-10-01T00:00:00.000Z' },
    ]);
    const target = lists();

    migrateCoinStacks(target);

    expect(target.lists().map(list => [list.name, list.items])).toEqual([
      ['Newer', [{ coin: eagle, quantity: 1 }]],
      ['Jar', [{ coin: morgan, quantity: 10, note: 'from grandpa' }]],
    ]);
    expect(store[COIN_STACK_KEY]).toBeUndefined();
    expect(lists().lists().length).toBe(2);
  });

  it('should not replace a metal list that has the same name', () => {
    const target = lists();
    target.save('jar', [{ metal: 'gold', type: '14K Gold (58.3%)', weight: 4.2, unit: 'grams' }]);
    store[COIN_STACK_KEY] = JSON.stringify([{ name: 'Jar', items: [{ id: morgan, quantity: 2 }], savedAt: '' }]);

    migrateCoinStacks(target);

    expect(target.lists().map(list => list.name)).toEqual(['Jar (coins)', 'jar']);
  });

  it('should skip coins it no longer knows and stacks left empty, and do nothing without old stacks', () => {
    const target = lists();
    migrateCoinStacks(target);
    expect(target.lists()).toEqual([]);

    store[COIN_STACK_KEY] = JSON.stringify([
      { name: 'Gone', items: [{ id: 'silver-not-a-coin', quantity: 2 }] },
      { name: 'Mixed', items: [{ id: 'silver-not-a-coin', quantity: 2 }, { id: morgan, quantity: 3 }] },
      'junk',
    ]);
    migrateCoinStacks(target);

    expect(target.lists().map(list => [list.name, list.items])).toEqual([['Mixed', [{ coin: morgan, quantity: 3 }]]]);
  });

  it('should leave things alone when storage is unreadable', () => {
    store[COIN_STACK_KEY] = '{not json';
    const target = lists();

    migrateCoinStacks(target);

    expect(target.lists()).toEqual([]);
    expect(store[COIN_STACK_KEY]).toBe('{not json');
  });
});
