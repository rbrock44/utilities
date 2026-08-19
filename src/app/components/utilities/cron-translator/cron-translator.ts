import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CronField {
  /** Every value the field matches, ascending. */
  values: number[];
  wildcard: boolean;
  text: string;
  meaning: string;
}

interface ParsedCron {
  seconds: CronField;
  minutes: CronField;
  hours: CronField;
  daysOfMonth: CronField;
  months: CronField;
  daysOfWeek: CronField;
  hasSeconds: boolean;
}

interface FieldRow {
  name: string;
  text: string;
  meaning: string;
}

const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const MONTH_ALIASES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DAY_ALIASES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

/** Enough steps to walk past a 29 February schedule without hanging the tab. */
const MAX_STEPS = 500_000;

@Component({
  selector: 'app-cron-translator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cron-translator.html',
  styleUrl: './cron-translator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CronTranslatorComponent {
  expression = '*/15 9-17 * * 1-5';
  description = '';
  errorMessage: string | null = null;
  fields: FieldRow[] = [];
  runs: Date[] = [];
  hasSeconds = false;

  readonly presets = [
    { label: 'Every 15 min', value: '*/15 * * * *' },
    { label: 'Hourly', value: '0 * * * *' },
    { label: 'Daily 9am', value: '0 9 * * *' },
    { label: 'Weekdays 9am', value: '0 9 * * 1-5' },
    { label: 'Monthly 1st', value: '0 0 1 * *' },
    { label: 'Sunday 2am', value: '0 2 * * 0' },
  ];

  readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  private readonly runFormat = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  constructor(private cdr: ChangeDetectorRef) {
    this.translate();
  }

  usePreset(value: string): void {
    this.expression = value;
    this.translate();
  }

  formatRun(date: Date): string {
    return this.runFormat.format(date);
  }

  translate(): void {
    this.errorMessage = null;
    this.description = '';
    this.fields = [];
    this.runs = [];

    const parsed = this.parse(this.expression);
    if (parsed === null) {
      this.cdr.markForCheck();
      return;
    }

    this.hasSeconds = parsed.hasSeconds;
    this.description = this.describe(parsed);
    this.fields = this.rows(parsed);
    this.runs = this.nextRuns(parsed, new Date(), 10);
    this.cdr.markForCheck();
  }

  /** Returns null and sets `errorMessage` when the expression cannot be read. */
  parse(expression: string): ParsedCron | null {
    const trimmed = expression.trim().toLowerCase();
    if (trimmed === '') {
      this.errorMessage = 'Enter a cron expression.';
      return null;
    }

    if (trimmed.startsWith('@')) {
      const macro = MACROS[trimmed];
      if (macro === undefined) {
        this.errorMessage = `${trimmed} is not a cron macro this tool knows.`;
        return null;
      }
      return this.parse(macro);
    }

    if (/[lw#]/.test(trimmed)) {
      this.errorMessage = 'Quartz extensions (L, W, #) are not supported.';
      return null;
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length !== 5 && parts.length !== 6) {
      this.errorMessage = `Expected 5 fields (or 6 with seconds), found ${parts.length}.`;
      return null;
    }

    const hasSeconds = parts.length === 6;
    const [seconds, minutes, hours, daysOfMonth, months, daysOfWeek] = hasSeconds
      ? parts
      : ['0', ...parts];

    const fields = {
      seconds: this.parseField(seconds, 0, 59, 'second'),
      minutes: this.parseField(minutes, 0, 59, 'minute'),
      hours: this.parseField(hours, 0, 23, 'hour'),
      daysOfMonth: this.parseField(daysOfMonth, 1, 31, 'day of month'),
      months: this.parseField(months, 1, 12, 'month', MONTH_ALIASES),
      daysOfWeek: this.parseField(daysOfWeek, 0, 7, 'day of week', DAY_ALIASES),
    };

    if (Object.values(fields).some((field) => field === null)) {
      return null;
    }

    const parsed = fields as { [K in keyof typeof fields]: CronField };
    // Cron accepts 7 for Sunday; fold it in so lookups only ever see 0-6.
    parsed.daysOfWeek.values = [
      ...new Set(parsed.daysOfWeek.values.map((day) => (day === 7 ? 0 : day))),
    ].sort((a, b) => a - b);

    return { ...parsed, hasSeconds };
  }

  private parseField(
    text: string,
    min: number,
    max: number,
    name: string,
    aliases?: Record<string, number>
  ): CronField | null {
    // `?` means "no opinion" in Quartz, which is the same as `*` once the other day
    // field has been read.
    const raw = text === '?' ? '*' : text;
    const values = new Set<number>();

    for (const part of raw.split(',')) {
      const [range, stepText] = part.split('/');
      const step = stepText === undefined ? 1 : Number(stepText);

      if (part.split('/').length > 2 || !Number.isInteger(step) || step < 1) {
        this.errorMessage = `"${text}" is not a valid ${name} field.`;
        return null;
      }

      let start: number;
      let end: number;

      if (range === '*') {
        start = min;
        end = max;
      } else {
        const bounds = range.split('-');
        if (bounds.length > 2) {
          this.errorMessage = `"${text}" is not a valid ${name} field.`;
          return null;
        }
        const from = this.toNumber(bounds[0], aliases);
        const to = bounds.length === 2 ? this.toNumber(bounds[1], aliases) : from;
        if (from === null || to === null) {
          this.errorMessage = `"${text}" is not a valid ${name} field.`;
          return null;
        }
        // A bare number with a step runs from that number to the end of the range.
        start = from;
        end = bounds.length === 2 ? to : stepText === undefined ? from : max;
      }

      if (start < min || end > max || end < start) {
        this.errorMessage = `${name} values have to be between ${min} and ${max}.`;
        return null;
      }
      for (let value = start; value <= end; value += step) {
        values.add(value);
      }
    }

    if (values.size === 0) {
      this.errorMessage = `"${text}" is not a valid ${name} field.`;
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    return {
      values: sorted,
      wildcard: raw === '*',
      text,
      meaning: this.meaning(sorted, raw, min, max, name),
    };
  }

  private toNumber(text: string, aliases?: Record<string, number>): number | null {
    if (aliases && text in aliases) {
      return aliases[text];
    }
    return /^\d+$/.test(text) ? Number(text) : null;
  }

  private meaning(
    values: number[],
    raw: string,
    min: number,
    max: number,
    name: string
  ): string {
    if (raw === '*') {
      return `Every ${name}`;
    }
    if (name === 'month') {
      return values.map((value) => MONTH_NAMES[value - 1]).join(', ');
    }
    if (name === 'day of week') {
      return values.map((value) => DAY_NAMES[value === 7 ? 0 : value]).join(', ');
    }
    if (values.length > 12) {
      return `${values.length} values from ${values[0]} to ${values[values.length - 1]}`;
    }
    return values.join(', ');
  }

  private rows(parsed: ParsedCron): FieldRow[] {
    const rows: FieldRow[] = [
      { name: 'Minute', text: parsed.minutes.text, meaning: parsed.minutes.meaning },
      { name: 'Hour', text: parsed.hours.text, meaning: parsed.hours.meaning },
      { name: 'Day of month', text: parsed.daysOfMonth.text, meaning: parsed.daysOfMonth.meaning },
      { name: 'Month', text: parsed.months.text, meaning: parsed.months.meaning },
      { name: 'Day of week', text: parsed.daysOfWeek.text, meaning: parsed.daysOfWeek.meaning },
    ];
    if (parsed.hasSeconds) {
      rows.unshift({
        name: 'Second',
        text: parsed.seconds.text,
        meaning: parsed.seconds.meaning,
      });
    }
    return rows;
  }

  describe(parsed: ParsedCron): string {
    const parts = [this.describeTime(parsed), this.describeDays(parsed)];
    if (!parsed.months.wildcard) {
      parts.push(`in ${this.list(parsed.months.values.map((m) => MONTH_NAMES[m - 1]))}`);
    }
    return `${parts.filter((part) => part !== '').join(', ')}.`;
  }

  private describeTime(parsed: ParsedCron): string {
    const { seconds, minutes, hours, hasSeconds } = parsed;
    const step = this.stepOf(minutes.text);
    const secondStep = this.stepOf(seconds.text);

    if (hasSeconds && seconds.wildcard && minutes.wildcard && hours.wildcard) {
      return 'Every second';
    }
    if (hasSeconds && secondStep !== null && minutes.wildcard && hours.wildcard) {
      return `Every ${secondStep} seconds`;
    }
    if (minutes.wildcard && hours.wildcard) {
      return 'Every minute';
    }
    if (step !== null && hours.wildcard) {
      return `Every ${step} minutes`;
    }
    if (hours.wildcard) {
      return `At ${this.list(minutes.values.map((m) => `minute ${m}`))} of every hour`;
    }
    if (step !== null) {
      return `Every ${step} minutes between ${this.clock(hours.values[0], 0)} and ${this.clock(
        hours.values[hours.values.length - 1],
        59
      )}`;
    }

    const times: string[] = [];
    for (const hour of hours.values) {
      for (const minute of minutes.values) {
        times.push(this.clock(hour, minute));
      }
    }
    return times.length <= 8
      ? `At ${this.list(times)}`
      : `At ${this.list(minutes.values.map((m) => `minute ${m}`))} of ${this.list(
          hours.values.map((h) => `${h}:00`)
        )}`;
  }

  private describeDays(parsed: ParsedCron): string {
    const { daysOfMonth, daysOfWeek } = parsed;

    if (daysOfMonth.wildcard && daysOfWeek.wildcard) {
      return 'every day';
    }

    const weekdays = this.list(daysOfWeek.values.map((day) => DAY_NAMES[day]));
    const dates = this.list(daysOfMonth.values.map((day) => this.ordinal(day)));

    if (daysOfMonth.wildcard) {
      return `on ${weekdays}`;
    }
    if (daysOfWeek.wildcard) {
      return `on the ${dates}`;
    }
    // With both fields set, cron fires when either one matches.
    return `on the ${dates} and on ${weekdays}`;
  }

  /** `*​/n` reads as "every n"; a plain list does not. */
  private stepOf(text: string): number | null {
    const match = /^\*\/(\d+)$/.exec(text);
    return match === null ? null : Number(match[1]);
  }

  private clock(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private ordinal(value: number): string {
    const tens = value % 100;
    if (tens >= 11 && tens <= 13) {
      return `${value}th`;
    }
    const suffix = ['th', 'st', 'nd', 'rd'][value % 10] ?? 'th';
    return `${value}${suffix}`;
  }

  private list(items: string[]): string {
    if (items.length <= 1) {
      return items[0] ?? '';
    }
    if (items.length === 2) {
      return `${items[0]} and ${items[1]}`;
    }
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  }

  /**
   * Walks forward a field at a time — skipping whole months and days that cannot match —
   * so a once-a-year schedule resolves in a few hundred steps instead of half a million
   * minute-by-minute checks.
   */
  nextRuns(parsed: ParsedCron, from: Date, count: number): Date[] {
    const runs: Date[] = [];
    const months = new Set(parsed.months.values);
    const hours = new Set(parsed.hours.values);
    const minutes = new Set(parsed.minutes.values);

    const cursor = new Date(from.getTime());
    cursor.setMilliseconds(0);
    cursor.setSeconds(cursor.getSeconds() + 1);

    for (let step = 0; step < MAX_STEPS && runs.length < count; step++) {
      if (!months.has(cursor.getMonth() + 1)) {
        cursor.setMonth(cursor.getMonth() + 1, 1);
        cursor.setHours(0, 0, 0, 0);
        continue;
      }
      if (!this.dayMatches(parsed, cursor)) {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
        continue;
      }
      if (!hours.has(cursor.getHours())) {
        cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
        continue;
      }
      if (!minutes.has(cursor.getMinutes())) {
        cursor.setMinutes(cursor.getMinutes() + 1, 0, 0);
        continue;
      }

      const second = parsed.seconds.values.find((value) => value >= cursor.getSeconds());
      if (second === undefined) {
        cursor.setMinutes(cursor.getMinutes() + 1, 0, 0);
        continue;
      }

      cursor.setSeconds(second, 0);
      runs.push(new Date(cursor.getTime()));
      cursor.setSeconds(cursor.getSeconds() + 1);
    }

    return runs;
  }

  /**
   * When both day fields are restricted, cron fires if either matches; when one is `*`
   * only the other one counts.
   */
  private dayMatches(parsed: ParsedCron, date: Date): boolean {
    const dateMatch = parsed.daysOfMonth.values.includes(date.getDate());
    const weekMatch = parsed.daysOfWeek.values.includes(date.getDay());

    if (parsed.daysOfMonth.wildcard) {
      return weekMatch;
    }
    if (parsed.daysOfWeek.wildcard) {
      return dateMatch;
    }
    return dateMatch || weekMatch;
  }
}
