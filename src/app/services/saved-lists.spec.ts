import { SavedListStore } from './saved-lists';

const isNumbers = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(n => typeof n === 'number');

describe('SavedListStore', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should start empty', () => {
    expect(new SavedListStore('test-lists', isNumbers).lists()).toEqual([]);
  });

  it('should keep the newest save first and replace a list saved under the same name', () => {
    const lists = new SavedListStore('test-lists', isNumbers);
    lists.save('Morgans', [1]);
    lists.save('Eagles', [2]);
    lists.save('morgans', [5]);

    expect(lists.lists().map(l => l.name)).toEqual(['morgans', 'Eagles']);
    expect(lists.lists()[0].items).toEqual([5]);
  });

  it('should persist under its own key and survive a new store', () => {
    new SavedListStore('test-lists', isNumbers).save('Kept', [3]);

    expect(JSON.parse(store['test-lists'])[0].name).toBe('Kept');
    expect(new SavedListStore('test-lists', isNumbers).lists()[0].items).toEqual([3]);
    expect(new SavedListStore('other-lists', isNumbers).lists()).toEqual([]);
  });

  it('should remove a list', () => {
    const lists = new SavedListStore('test-lists', isNumbers);
    lists.save('Gone', [1]);
    lists.remove('Gone');

    expect(lists.lists()).toEqual([]);
    expect(JSON.parse(store['test-lists'])).toEqual([]);
  });

  it('should drop saved entries that fail the items check', () => {
    store['test-lists'] = JSON.stringify([
      { name: 'Good', items: [1, 2], savedAt: '2026-10-10T00:00:00Z' },
      { name: 'Bad items', items: ['x'], savedAt: '2026-10-10T00:00:00Z' },
      { items: [1], savedAt: '2026-10-10T00:00:00Z' },
    ]);

    expect(new SavedListStore('test-lists', isNumbers).lists().map(l => l.name)).toEqual(['Good']);
  });

  it('should survive corrupt or blocked storage', () => {
    store['test-lists'] = '{oops';
    expect(new SavedListStore('test-lists', isNumbers).lists()).toEqual([]);

    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    const lists = new SavedListStore('test-lists', isNumbers);
    expect(() => lists.save('X', [])).not.toThrow();
    expect(lists.lists().length).toBe(1);
  });
});
