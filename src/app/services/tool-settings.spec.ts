import { TestBed } from '@angular/core/testing';

import { resolveSettings, SettingDefinition, ToolSettingsService } from './tool-settings';

const DEFINITIONS: SettingDefinition[] = [
  { kind: 'select', key: 'unit', label: 'Unit', default: 'g', options: [{ value: 'g', label: 'g' }, { value: 'dwt', label: 'dwt' }] },
  { kind: 'numbers', key: 'cols', label: 'Columns', default: [100, 90, 80], labels: ['a', 'b', 'c'], min: 1, max: 200 },
];

describe('ToolSettingsService', () => {
  let store: Record<string, string>;

  const create = () => TestBed.inject(ToolSettingsService);

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

  it('should start on the defaults', () => {
    const values = create().values('tool', DEFINITIONS);
    expect(values()).toEqual({ unit: 'g', cols: [100, 90, 80] });
  });

  it('should save a change per tool and reset back to defaults', () => {
    const service = create();
    const values = service.values('tool', DEFINITIONS);

    service.set('tool', 'unit', 'dwt');
    expect(values()['unit']).toBe('dwt');
    expect(service.changedKeys('tool', DEFINITIONS)).toEqual(['unit']);
    expect(service.changedKeys('other', DEFINITIONS)).toEqual([]);
    expect(JSON.parse(store['utilities-settings'])).toEqual({ tool: { unit: 'dwt' } });

    service.reset('tool');
    expect(values()['unit']).toBe('g');
    expect(service.changedKeys('tool', DEFINITIONS)).toEqual([]);
  });

  it('should not count a value set back to its default as changed', () => {
    const service = create();
    service.set('tool', 'cols', [100, 95, 80]);
    expect(service.changedKeys('tool', DEFINITIONS)).toEqual(['cols']);
    service.set('tool', 'cols', [100, 90, 80]);
    expect(service.changedKeys('tool', DEFINITIONS)).toEqual([]);
  });

  it('should read saved settings back', () => {
    store['utilities-settings'] = JSON.stringify({ tool: { cols: [95, 85, 75] } });
    expect(create().values('tool', DEFINITIONS)()).toEqual({ unit: 'g', cols: [95, 85, 75] });
  });

  it('should fall back per value on anything stale or out of range', () => {
    expect(resolveSettings(DEFINITIONS, { unit: 'cubit', cols: [95, 0, 'x'] })).toEqual({ unit: 'g', cols: [95, 90, 80] });
    expect(resolveSettings(DEFINITIONS, 'junk')).toEqual({ unit: 'g', cols: [100, 90, 80] });
  });

  it('should start on defaults from junk storage', () => {
    store['utilities-settings'] = '{not json';
    expect(create().values('tool', DEFINITIONS)()['unit']).toBe('g');
  });

  it('should still apply a change when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    const service = create();
    service.set('tool', 'unit', 'dwt');
    expect(service.values('tool', DEFINITIONS)()['unit']).toBe('dwt');
  });
});
