import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColorConverterComponent } from './color-converter';

describe('ColorConverterComponent', () => {
  let component: ColorConverterComponent;
  let fixture: ComponentFixture<ColorConverterComponent>;

  const enter = (format: 'hex' | 'rgb' | 'hsl', text: string) => {
    component.values[format] = text;
    component.onFieldChange(format);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorConverterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColorConverterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should convert HEX into RGB and HSL', () => {
    enter('hex', '#FF0000');

    expect(component.values.rgb).toBe('rgb(255, 0, 0)');
    expect(component.values.hsl).toBe('hsl(0, 100%, 50%)');
  });

  it('should expand 3-digit shorthand HEX', () => {
    enter('hex', '#0F0');

    expect(component.values.rgb).toBe('rgb(0, 255, 0)');
  });

  it('should accept HEX without a leading hash', () => {
    enter('hex', '0000ff');

    expect(component.values.rgb).toBe('rgb(0, 0, 255)');
  });

  it('should convert RGB into HEX', () => {
    enter('rgb', 'rgb(25, 118, 210)');

    expect(component.values.hex).toBe('#1976D2');
  });

  it('should accept bare comma-separated RGB channels', () => {
    enter('rgb', '255, 255, 0');

    expect(component.values.hex).toBe('#FFFF00');
  });

  it('should convert HSL into HEX', () => {
    enter('hsl', 'hsl(210, 79%, 46%)');

    expect(component.values.hex).toBe('#1975D2');
  });

  it('should round-trip through HSL within integer rounding tolerance', () => {
    enter('hex', '#3A7BD5');
    const original = { ...component.color };

    // HSL is shown as whole numbers, so a round trip can drift by one per channel.
    enter('hsl', component.values.hsl);

    expect(Math.abs(component.color.r - original.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(component.color.g - original.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(component.color.b - original.b)).toBeLessThanOrEqual(1);
  });

  it('should treat greyscale as zero saturation', () => {
    enter('hex', '#808080');

    expect(component.values.hsl).toBe('hsl(0, 0%, 50%)');
  });

  it('should reject malformed input', () => {
    enter('hex', '#12345');

    expect(component.errorMessage).toContain('HEX');
  });

  it('should reject out-of-range RGB channels', () => {
    enter('rgb', 'rgb(300, 0, 0)');

    expect(component.errorMessage).toContain('RGB');
  });

  it('should compute the WCAG contrast ratio for black on white', () => {
    enter('hex', '#000000');
    component.backgroundHex = '#FFFFFF';
    component.onBackgroundChange();

    expect(component.contrastRatio).toBeCloseTo(21, 2);
    expect(component.checks.every((check) => check.passes)).toBe(true);
  });

  it('should report a failing contrast ratio for a low-contrast pair', () => {
    enter('hex', '#CCCCCC');
    component.backgroundHex = '#FFFFFF';
    component.onBackgroundChange();

    expect(component.contrastRatio).toBeLessThan(3);
    expect(component.checks.every((check) => !check.passes)).toBe(true);
  });

  it('should give the same ratio regardless of which color is lighter', () => {
    enter('hex', '#000000');
    component.backgroundHex = '#FFFFFF';
    component.onBackgroundChange();
    const before = component.contrastRatio;

    component.swap();

    expect(component.contrastRatio).toBeCloseTo(before, 10);
    expect(component.values.hex).toBe('#FFFFFF');
    expect(component.backgroundHex).toBe('#000000');
  });
});
