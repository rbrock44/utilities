import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  evaluateLengths,
  formatFraction,
  InchFractionConverterComponent,
  parseLength,
  toFraction,
} from './inch-fraction-converter';

describe('parseLength', () => {
  it('should read whole, mixed, plain-fraction, and decimal inches', () => {
    expect(parseLength('3')).toBe(3);
    expect(parseLength('3 5/8')).toBe(3.625);
    expect(parseLength('5/8')).toBe(0.625);
    expect(parseLength('3.625')).toBe(3.625);
    expect(parseLength('.5')).toBe(0.5);
  });

  it('should accept inch marks and words', () => {
    expect(parseLength('3 5/8"')).toBe(3.625);
    expect(parseLength('2 in')).toBe(2);
    expect(parseLength('2 inches')).toBe(2);
  });

  it('should convert metric to inches', () => {
    expect(parseLength('25.4 mm')).toBeCloseTo(1);
    expect(parseLength('2.54cm')).toBeCloseTo(1);
    expect(parseLength('1.2 m')).toBeCloseTo(47.2441, 4);
  });

  it('should read feet with or without inches', () => {
    expect(parseLength(`5' 3 1/2"`)).toBe(63.5);
    expect(parseLength(`6'`)).toBe(72);
    expect(parseLength('2 ft 6')).toBe(30);
  });

  it('should reject nonsense and divide-by-zero', () => {
    expect(parseLength('')).toBeNull();
    expect(parseLength('abc')).toBeNull();
    expect(parseLength('1/0')).toBeNull();
    expect(parseLength('3 1/0')).toBeNull();
    expect(parseLength(`5' abc`)).toBeNull();
  });
});

describe('evaluateLengths', () => {
  it('should add and subtract measurements', () => {
    expect(evaluateLengths('3 5/8 + 1 3/16')).toBe(4.8125);
    expect(evaluateLengths('3 5/8 + 1 3/16 - 1/2')).toBe(4.3125);
  });

  it('should read a dash between a whole number and a fraction as a mixed number', () => {
    expect(evaluateLengths('3-5/8')).toBe(3.625);
    expect(evaluateLengths('10-3')).toBe(7);
    expect(evaluateLengths('10 - 3/4')).toBe(9.25);
  });

  it('should mix units', () => {
    expect(evaluateLengths(`1' + 25.4 mm`)).toBeCloseTo(13);
  });

  it('should handle typographic quotes and minus signs', () => {
    expect(evaluateLengths('3 5/8″ − 1/8″')).toBe(3.5);
  });

  it('should allow a negative result and a leading minus', () => {
    expect(evaluateLengths('3 5/8 - 4')).toBe(-0.375);
    expect(evaluateLengths('-1/2')).toBe(-0.5);
  });

  it('should reject a bad term or an empty expression', () => {
    expect(evaluateLengths('3 + x')).toBeNull();
    expect(evaluateLengths(' + ')).toBeNull();
  });
});

describe('toFraction', () => {
  const label = (inches: number, denominator = 16) => formatFraction(toFraction(inches, denominator));

  it('should round to the nearest mark and reduce', () => {
    expect(label(3.625)).toBe('3 5/8″');
    expect(label(0.4375, 8)).toBe('1/2″');
    expect(label(1 / 64, 64)).toBe('1/64″');
    expect(label(0.999)).toBe('1″');
  });

  it('should report how far rounding moved the value', () => {
    const fraction = toFraction(3.622, 16);
    expect(fraction.error).toBeCloseTo(-0.003, 3);
  });

  it('should keep the sign, but not on a value that rounds to zero', () => {
    expect(label(-0.375)).toBe('−3/8″');
    expect(label(-0.01)).toBe('0″');
  });
});

describe('InchFractionConverterComponent', () => {
  let component: InchFractionConverterComponent;
  let fixture: ComponentFixture<InchFractionConverterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InchFractionConverterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InchFractionConverterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should start with a worked example', () => {
    expect(component.fractionLabel).toBe('4 13/16″');
    expect(component.decimalLabel).toBe('4.8125″');
    expect(component.roundingNote).toBeNull();
    expect(component.feetLabel).toBeNull();
  });

  it('should convert millimeters and note the rounding', () => {
    component.input = '92 mm';

    expect(component.fractionLabel).toBe('3 5/8″');
    expect(component.roundingNote).toBe('exact is 0.003″ shorter');
    expect(component.mmLabel).toBe('92.00 mm');
    expect(component.cmLabel).toBe('9.20 cm');
  });

  it('should round to the chosen precision', () => {
    component.input = '0.7';
    component.precision = 8;
    expect(component.fractionLabel).toBe('3/4″');

    component.precision = 32;
    expect(component.fractionLabel).toBe('11/16″');
  });

  it('should show feet and inches from a foot up', () => {
    component.input = `5' 3 1/2"`;
    expect(component.feetLabel).toBe('5′ 3 1/2″');

    component.input = '3 5/8 - 20';
    expect(component.feetLabel).toBe('−1′ 4 3/8″');
  });

  it('should explain input it cannot read, but stay quiet when empty', () => {
    component.input = '3 + x';
    expect(component.errorMessage).toContain('Couldn\'t read that');
    expect(component.fraction).toBeNull();

    component.input = '   ';
    expect(component.errorMessage).toBeNull();
  });

  it('should chart all sixteen marks to an inch', () => {
    expect(component.chart.length).toBe(16);
    expect(component.chart[0]).toEqual({ fraction: '1/16″', decimal: '0.0625', mm: '1.59' });
    expect(component.chart[15].fraction).toBe('1″');
  });
});
