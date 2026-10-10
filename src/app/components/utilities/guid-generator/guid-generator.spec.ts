import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuidGeneratorComponent, uuidV7, uuidV7Time } from './guid-generator';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('GuidGeneratorComponent', () => {
  let component: GuidGeneratorComponent;
  let fixture: ComponentFixture<GuidGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidGeneratorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuidGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should generate one v4 GUID on load', () => {
    expect(component.results.length).toBe(1);
    expect(component.results[0]).toMatch(UUID_V4);
  });

  it('should generate the requested number of unique GUIDs', () => {
    component.count = 25;
    component.generate();

    expect(component.results.length).toBe(25);
    expect(new Set(component.results).size).toBe(25);
    expect(component.results.every(guid => UUID_V4.test(guid))).toBe(true);
  });

  it('should fall back to 1 for invalid counts and floor fractions', () => {
    component.count = 0;
    expect(component.normalizedCount).toBe(1);

    component.count = NaN;
    expect(component.normalizedCount).toBe(1);

    component.count = 3.9;
    expect(component.normalizedCount).toBe(3);
  });

  it('should copy all GUIDs one per line', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    component.count = 2;
    component.generate();

    await component.copyAllToClipboard();

    expect(writeText).toHaveBeenCalledWith(component.results.join('\n'));
    expect(component.justCopiedAll).toBe(true);
  });

  it('should generate time-ordered v7 GUIDs that sort in creation order', () => {
    component.version = 7;
    component.count = 50;
    component.generate();

    expect(component.results.every(guid => UUID_V7.test(guid))).toBe(true);
    expect([...component.results].sort()).toEqual(component.results);
    expect(new Set(component.results).size).toBe(50);
  });

  it('should show the creation time for v7 only', () => {
    expect(component.createdAt).toBeNull();

    component.version = 7;
    component.generate();
    expect(component.createdAt).toBe(uuidV7Time(component.results[0]).toLocaleString());
  });
});

describe('uuidV7', () => {
  const MS = Date.UTC(2026, 9, 9, 12, 0, 0);

  it('should embed the millisecond timestamp in the first 48 bits', () => {
    const uuid = uuidV7(MS, { lastMs: -1, counter: 0 });

    expect(uuid).toMatch(UUID_V7);
    expect(uuid.replace(/-/g, '').slice(0, 12)).toBe(MS.toString(16).padStart(12, '0'));
    expect(uuidV7Time(uuid).getTime()).toBe(MS);
  });

  it('should step the counter within the same millisecond', () => {
    const state = { lastMs: -1, counter: 0 };
    const first = uuidV7(MS, state);
    const counter = state.counter;
    const second = uuidV7(MS, state);

    expect(state.counter).toBe(counter + 1);
    expect(second > first).toBe(true);
  });

  it('should borrow the next millisecond when the counter overflows', () => {
    const state = { lastMs: MS, counter: 0xfff };
    const uuid = uuidV7(MS, state);

    expect(state.lastMs).toBe(MS + 1);
    expect(uuidV7Time(uuid).getTime()).toBe(MS + 1);
  });

  it('should never go backwards when the clock does', () => {
    const state = { lastMs: -1, counter: 0 };
    const later = uuidV7(MS, state);
    const earlierClock = uuidV7(MS - 5000, state);

    expect(earlierClock > later).toBe(true);
    expect(uuidV7Time(earlierClock).getTime()).toBe(MS);
  });
});
