import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Unit = 'auto' | 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds';
type Basis = 'local' | 'utc';

interface ResultRow {
  key: string;
  label: string;
  value: string;
}

const MAX_DATE_MS = 8.64e15;

@Component({
  selector: 'app-timestamp-converter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timestamp-converter.html',
  styleUrl: './timestamp-converter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimestampConverterComponent implements OnInit, OnDestroy {
  readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  nowMs = Date.now();

  timestampInput = '';
  unit: Unit = 'auto';
  detectedUnit: Unit = 'seconds';
  parsedMs: number | null = null;
  timestampError: string | null = null;

  dateInput = '';
  basis: Basis = 'local';
  dateMs: number | null = null;
  dateError: string | null = null;

  copiedKey: string | null = null;

  private ticker: ReturnType<typeof setInterval> | null = null;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.ticker = setInterval(() => {
      this.nowMs = Date.now();
      this.cdr.markForCheck();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
    }
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
  }

  get nowSeconds(): number {
    return Math.floor(this.nowMs / 1000);
  }

  useNow(): void {
    this.timestampInput = String(this.nowSeconds);
    this.unit = 'auto';
    this.parseTimestamp();
  }

  parseTimestamp(): void {
    this.timestampError = null;
    this.parsedMs = null;

    const text = this.timestampInput.trim().replace(/[_\s,]/g, '');
    if (text === '') {
      this.cdr.markForCheck();
      return;
    }

    if (!/^-?\d+(\.\d+)?$/.test(text)) {
      this.timestampError = 'Enter a number — digits only.';
      this.cdr.markForCheck();
      return;
    }

    const value = Number(text);
    const unit = this.unit === 'auto' ? this.detectUnit(text) : this.unit;
    this.detectedUnit = unit;

    const divisors: Record<Exclude<Unit, 'auto'>, number> = {
      seconds: 0.001,
      milliseconds: 1,
      microseconds: 1000,
      nanoseconds: 1e6,
    };
    const ms = value / divisors[unit];

    if (!Number.isFinite(ms) || Math.abs(ms) > MAX_DATE_MS) {
      this.timestampError = 'That is outside the range of dates a browser can represent.';
      this.cdr.markForCheck();
      return;
    }

    this.parsedMs = ms;
    this.cdr.markForCheck();
  }

  get detectedUnitLabel(): string {
    return this.detectedUnit;
  }

  get timestampRows(): ResultRow[] {
    if (this.parsedMs === null) {
      return [];
    }

    const date = new Date(this.parsedMs);

    return [
      {
        key: 'local',
        label: `Local (${this.timeZone})`,
        value: date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' }),
      },
      {
        key: 'utc',
        label: 'UTC',
        value: date.toLocaleString(undefined, {
          dateStyle: 'full',
          timeStyle: 'long',
          timeZone: 'UTC',
        }),
      },
      { key: 'iso', label: 'ISO 8601', value: date.toISOString() },
      {
        key: 'seconds',
        label: 'Epoch seconds',
        value: String(Math.floor(this.parsedMs / 1000)),
      },
      {
        key: 'millis',
        label: 'Epoch milliseconds',
        value: String(Math.round(this.parsedMs)),
      },
    ];
  }

  parseDate(): void {
    this.dateError = null;
    this.dateMs = null;

    const text = this.dateInput;
    if (!text) {
      this.cdr.markForCheck();
      return;
    }

    const withSeconds = text.length === 16 ? `${text}:00` : text;
    const parsed = new Date(this.basis === 'utc' ? `${withSeconds}Z` : withSeconds);

    if (Number.isNaN(parsed.getTime())) {
      this.dateError = 'That date and time could not be read.';
      this.cdr.markForCheck();
      return;
    }

    this.dateMs = parsed.getTime();
    this.cdr.markForCheck();
  }

  get dateRows(): ResultRow[] {
    if (this.dateMs === null) {
      return [];
    }

    const date = new Date(this.dateMs);

    return [
      { key: 'd-seconds', label: 'Epoch seconds', value: String(Math.floor(this.dateMs / 1000)) },
      { key: 'd-millis', label: 'Epoch milliseconds', value: String(this.dateMs) },
      { key: 'd-iso', label: 'ISO 8601', value: date.toISOString() },
    ];
  }

  async copy(key: string, value: string): Promise<void> {
    await navigator.clipboard.writeText(value);

    this.copiedKey = key;
    this.cdr.markForCheck();

    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
    this.copiedTimeout = setTimeout(() => {
      this.copiedKey = null;
      this.cdr.markForCheck();
    }, 2000);
  }

  private detectUnit(text: string): Exclude<Unit, 'auto'> {
    const digits = text.replace(/^-/, '').split('.')[0].length;

    if (digits >= 18) {
      return 'nanoseconds';
    }
    if (digits >= 15) {
      return 'microseconds';
    }
    if (digits >= 12) {
      return 'milliseconds';
    }
    return 'seconds';
  }
}
