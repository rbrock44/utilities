import { TestBed } from '@angular/core/testing';

import { FavoritesService } from './favorites';

describe('FavoritesService', () => {
  let store: Record<string, string>;

  const create = () => TestBed.inject(FavoritesService);

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
    const service = create();
    expect(service.pinned()).toEqual([]);
    expect(service.recent()).toEqual([]);
  });

  it('should pin and unpin a tool and persist it', () => {
    const service = create();

    service.toggle('jwt-decoder');
    expect(service.isPinned('jwt-decoder')).toBe(true);
    expect(JSON.parse(store['utilities-pinned'])).toEqual(['jwt-decoder']);

    service.toggle('jwt-decoder');
    expect(service.isPinned('jwt-decoder')).toBe(false);
    expect(JSON.parse(store['utilities-pinned'])).toEqual([]);
  });

  it('should keep pins in the order they were added', () => {
    const service = create();
    service.toggle('loan-calculator');
    service.toggle('jwt-decoder');

    expect(service.pinnedTools().map(tool => tool.param)).toEqual(['loan-calculator', 'jwt-decoder']);
  });

  it('should ignore tools that are not on the home page', () => {
    const service = create();
    service.toggle('cleaning-payout-calculator');
    service.recordVisit('cleaning-payout-calculator');

    expect(service.pinned()).toEqual([]);
    expect(service.recent()).toEqual([]);
  });

  it('should keep recents newest-first, deduplicated, and capped at 6', () => {
    const service = create();
    ['guid-generator', 'hex-generator', 'text-diff', 'url-encoder', 'jwt-decoder', 'json-formatter', 'qr-code-generator']
      .forEach(param => service.recordVisit(param));
    service.recordVisit('url-encoder');

    expect(service.recent()).toEqual([
      'url-encoder', 'qr-code-generator', 'json-formatter', 'jwt-decoder', 'text-diff', 'hex-generator'
    ]);
  });

  it('should leave pinned tools out of the recent list', () => {
    const service = create();
    service.recordVisit('jwt-decoder');
    service.recordVisit('loan-calculator');
    service.toggle('jwt-decoder');

    expect(service.recentTools().map(tool => tool.param)).toEqual(['loan-calculator']);
  });

  it('should restore saved state and drop tools that no longer exist', () => {
    store['utilities-pinned'] = JSON.stringify(['jwt-decoder', 'deleted-tool', 42]);
    store['utilities-recent'] = JSON.stringify(['loan-calculator']);

    const service = create();
    expect(service.pinned()).toEqual(['jwt-decoder']);
    expect(service.recent()).toEqual(['loan-calculator']);
  });

  it('should survive corrupt or blocked storage', () => {
    store['utilities-pinned'] = '{not json';
    expect(create().pinned()).toEqual([]);

    TestBed.resetTestingModule();
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    const service = create();
    expect(() => service.toggle('jwt-decoder')).not.toThrow();
    expect(service.isPinned('jwt-decoder')).toBe(true);
  });
});
