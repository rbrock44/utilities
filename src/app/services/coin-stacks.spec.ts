import { TestBed } from '@angular/core/testing';

import { CoinStacksService } from './coin-stacks';

describe('CoinStacksService', () => {
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
    expect(TestBed.inject(CoinStacksService).stacks()).toEqual([]);
  });

  it('should keep the newest save first and replace a stack saved under the same name', () => {
    const service = TestBed.inject(CoinStacksService);
    service.save('Morgans', [{ id: 'a', quantity: 1 }]);
    service.save('Eagles', [{ id: 'b', quantity: 2 }]);
    service.save('morgans', [{ id: 'a', quantity: 5 }]);

    expect(service.stacks().map(s => s.name)).toEqual(['morgans', 'Eagles']);
    expect(service.stacks()[0].items).toEqual([{ id: 'a', quantity: 5 }]);
  });

  it('should remove a stack and persist the change', () => {
    const service = TestBed.inject(CoinStacksService);
    service.save('Morgans', [{ id: 'a', quantity: 1 }]);
    service.remove('Morgans');

    expect(service.stacks()).toEqual([]);
    expect(JSON.parse(store['utilities-coin-stacks'])).toEqual([]);
  });

  it('should restore saved stacks and drop malformed ones', () => {
    store['utilities-coin-stacks'] = JSON.stringify([
      { name: 'Good', items: [{ id: 'a', quantity: 2 }], savedAt: '2026-10-10T00:00:00Z' },
      { name: 'Bad quantity', items: [{ id: 'a', quantity: 'x' }], savedAt: '2026-10-10T00:00:00Z' },
      { items: [], savedAt: '2026-10-10T00:00:00Z' },
    ]);

    expect(TestBed.inject(CoinStacksService).stacks().map(s => s.name)).toEqual(['Good']);
  });

  it('should survive corrupt or blocked storage', () => {
    store['utilities-coin-stacks'] = '{oops';
    expect(TestBed.inject(CoinStacksService).stacks()).toEqual([]);

    TestBed.resetTestingModule();
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    const service = TestBed.inject(CoinStacksService);
    expect(() => service.save('X', [])).not.toThrow();
    expect(service.stacks().length).toBe(1);
  });
});
