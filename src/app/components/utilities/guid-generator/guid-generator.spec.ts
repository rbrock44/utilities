import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuidGeneratorComponent } from './guid-generator';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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
});
