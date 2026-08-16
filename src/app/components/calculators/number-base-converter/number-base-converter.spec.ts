import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NumberBaseConverterComponent } from './number-base-converter';

describe('NumberBaseConverterComponent', () => {
  let component: NumberBaseConverterComponent;
  let fixture: ComponentFixture<NumberBaseConverterComponent>;

  const enter = (base: number, text: string) => {
    component.values[base] = text;
    component.onValueChange(base);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumberBaseConverterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NumberBaseConverterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should convert decimal into the other bases', () => {
    enter(10, '255');

    expect(component.values[2]).toBe('11111111');
    expect(component.values[8]).toBe('377');
    expect(component.values[16]).toBe('FF');
    expect(component.errorMessage).toBeNull();
  });

  it('should accept lowercase hex and convert back to decimal', () => {
    enter(16, 'ff');

    expect(component.values[10]).toBe('255');
    expect(component.values[2]).toBe('11111111');
  });

  it('should ignore spaces, underscores, and commas', () => {
    enter(2, '1111 0000');

    expect(component.values[10]).toBe('240');
  });

  it('should accept 0x, 0b, and 0o prefixes', () => {
    enter(16, '0xFF');
    expect(component.values[10]).toBe('255');

    enter(2, '0b1010');
    expect(component.values[10]).toBe('10');

    enter(8, '0o17');
    expect(component.values[10]).toBe('15');
  });

  it('should reject digits that are invalid for the base', () => {
    enter(2, '2');

    expect(component.errorMessage).toContain('binary');
    expect(component.values[10]).toBe('');
  });

  it('should handle values beyond Number.MAX_SAFE_INTEGER without precision loss', () => {
    enter(10, '18446744073709551615');

    expect(component.values[16]).toBe('FFFFFFFFFFFFFFFF');
    expect(component.bitLength).toBe(64);
  });

  it('should keep the sign on negative values', () => {
    enter(10, '-42');

    expect(component.values[16]).toBe('-2A');
    expect(component.isNegative).toBe(true);
  });

  it('should report bit and byte length', () => {
    enter(10, '255');

    expect(component.bitLength).toBe(8);
    expect(component.byteLength).toBe(1);
  });

  it('should clear every field when the source field is emptied', () => {
    enter(10, '255');
    enter(10, '');

    expect(component.values[2]).toBe('');
    expect(component.values[16]).toBe('');
    expect(component.value).toBeNull();
  });

  it('should clear all fields on clearAll', () => {
    enter(10, '255');
    component.clearAll();

    expect(component.values[10]).toBe('');
    expect(component.values[16]).toBe('');
    expect(component.hasInput).toBe(false);
  });
});
