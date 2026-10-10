import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HexGeneratorComponent } from './hex-generator';

describe('HexGeneratorComponent', () => {
  let component: HexGeneratorComponent;
  let fixture: ComponentFixture<HexGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HexGeneratorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HexGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should generate one 8-digit hex string on load', () => {
    expect(component.results.length).toBe(1);
    expect(component.results[0]).toMatch(/^[0-9a-f]{8}$/);
  });

  it('should honor odd digit counts exactly', () => {
    component.digits = 5;
    component.count = 10;
    component.generate();

    expect(component.results.length).toBe(10);
    expect(component.results.every(hex => /^[0-9a-f]{5}$/.test(hex))).toBe(true);
  });

  it('should fall back to 1 for invalid digits and counts', () => {
    component.digits = -4;
    component.count = 0;
    component.generate();

    expect(component.results.length).toBe(1);
    expect(component.results[0]).toMatch(/^[0-9a-f]$/);
  });

  it('should floor fractional inputs', () => {
    component.digits = 6.7;
    component.count = 2.2;

    expect(component.normalizedDigits).toBe(6);
    expect(component.normalizedCount).toBe(2);
  });

  it('should copy a single value and flag which row was copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await component.copyToClipboard('abc123', 0);

    expect(writeText).toHaveBeenCalledWith('abc123');
    expect(component.justCopiedIndex).toBe(0);
  });
});
