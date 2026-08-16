import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimestampConverterComponent } from './timestamp-converter';

describe('TimestampConverterComponent', () => {
  let component: TimestampConverterComponent;
  let fixture: ComponentFixture<TimestampConverterComponent>;

  const enterTimestamp = (text: string) => {
    component.timestampInput = text;
    component.parseTimestamp();
  };

  const rowValue = (key: string) =>
    component.timestampRows.find((row) => row.key === key)?.value;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimestampConverterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimestampConverterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should read a 10-digit value as seconds', () => {
    enterTimestamp('1700000000');

    expect(component.detectedUnit).toBe('seconds');
    expect(rowValue('iso')).toBe('2023-11-14T22:13:20.000Z');
  });

  it('should read a 13-digit value as milliseconds', () => {
    enterTimestamp('1700000000123');

    expect(component.detectedUnit).toBe('milliseconds');
    expect(rowValue('iso')).toBe('2023-11-14T22:13:20.123Z');
  });

  it('should read a 16-digit value as microseconds', () => {
    enterTimestamp('1700000000123456');

    expect(component.detectedUnit).toBe('microseconds');
    expect(rowValue('seconds')).toBe('1700000000');
  });

  it('should read a 19-digit value as nanoseconds', () => {
    enterTimestamp('1700000000123456789');

    expect(component.detectedUnit).toBe('nanoseconds');
    expect(rowValue('seconds')).toBe('1700000000');
  });

  it('should honour an explicit unit over auto-detection', () => {
    component.unit = 'milliseconds';
    enterTimestamp('1700000000');

    expect(rowValue('iso')).toBe('1970-01-20T16:13:20.000Z');
  });

  it('should ignore separators in the input', () => {
    enterTimestamp('1,700,000,000');

    expect(rowValue('seconds')).toBe('1700000000');
  });

  it('should reject non-numeric input', () => {
    enterTimestamp('yesterday');

    expect(component.timestampError).toBeTruthy();
    expect(component.timestampRows.length).toBe(0);
  });

  it('should reject timestamps outside the representable date range', () => {
    component.unit = 'milliseconds';
    enterTimestamp('99999999999999999999');

    expect(component.timestampError).toContain('outside the range');
    expect(component.parsedMs).toBeNull();
  });

  it('should still accept a very large value when auto-detect reads it as nanoseconds', () => {
    enterTimestamp('99999999999999999999');

    expect(component.detectedUnit).toBe('nanoseconds');
    expect(component.timestampError).toBeNull();
  });

  it('should handle negative timestamps before 1970', () => {
    enterTimestamp('-86400');

    expect(rowValue('iso')).toBe('1969-12-31T00:00:00.000Z');
  });

  it('should convert a UTC date back to epoch seconds', () => {
    component.basis = 'utc';
    component.dateInput = '2023-11-14T22:13:20';
    component.parseDate();

    const seconds = component.dateRows.find((row) => row.key === 'd-seconds')?.value;
    expect(seconds).toBe('1700000000');
  });

  it('should clear results when the timestamp input is emptied', () => {
    enterTimestamp('1700000000');
    enterTimestamp('');

    expect(component.parsedMs).toBeNull();
    expect(component.timestampRows.length).toBe(0);
  });

  it('should fill the input from the current time', () => {
    component.useNow();

    expect(component.timestampInput).toBe(String(component.nowSeconds));
    expect(component.parsedMs).not.toBeNull();
  });
});
