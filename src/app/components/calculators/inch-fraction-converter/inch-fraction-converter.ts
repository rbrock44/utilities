import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const MM_PER_INCH = 25.4;

export interface Fraction {
  negative: boolean;
  whole: number;
  numerator: number;
  denominator: number;
  /** How far the fraction is from the exact value, in inches (exact minus rounded). */
  error: number;
}

/**
 * Reads one length in inches: `3 5/8`, `5/8`, `3.625`, `3 5/8"`, `92 mm`, `9.2 cm`, `1.2 m`,
 * or feet and inches like `5' 3 1/2"`. Returns null for anything else.
 */
export function parseLength(text: string): number | null {
  const term = text.trim().toLowerCase();
  if (term === '') {
    return null;
  }

  const feet = /^(\d+(?:\.\d+)?)\s*(?:'|ft|feet|foot)\s*(.*)$/.exec(term);
  if (feet) {
    const rest = feet[2].trim();
    const inches = rest === '' ? 0 : parseInches(rest);
    return inches === null ? null : Number(feet[1]) * 12 + inches;
  }

  const metric = /^(\d*\.?\d+)\s*(mm|cm|m)$/.exec(term);
  if (metric) {
    const mm = Number(metric[1]) * { mm: 1, cm: 10, m: 1000 }[metric[2] as 'mm' | 'cm' | 'm'];
    return mm / MM_PER_INCH;
  }

  return parseInches(term);
}

function parseInches(text: string): number | null {
  const term = text.replace(/\s*(?:"|in|inch|inches)$/, '').trim();

  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(term);
  if (mixed) {
    return Number(mixed[3]) === 0 ? null : Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  }

  const fraction = /^(\d+)\/(\d+)$/.exec(term);
  if (fraction) {
    return Number(fraction[2]) === 0 ? null : Number(fraction[1]) / Number(fraction[2]);
  }

  return /^\d*\.?\d+$/.test(term) ? Number(term) : null;
}

/**
 * Evaluates lengths joined by + and -, e.g. `3 5/8 + 1 3/16 - 1/2`. A dash directly between
 * a whole number and a fraction (`3-5/8`) is how tape measures are written, so it is read as
 * a mixed number rather than subtraction.
 */
export function evaluateLengths(text: string): number | null {
  const normalized = text
    .replace(/[″“”]/g, '"')
    .replace(/[′‘’]/g, "'")
    .replace(/[−–—]/g, '-')
    .replace(/(\d)-(\d+\/\d+)/g, '$1 $2');

  const parts = normalized.split(/([+-])/);
  let total = 0;
  let sign = 1;
  let sawTerm = false;

  for (const part of parts) {
    if (part === '+' || part === '-') {
      sign = part === '-' ? -sign : sign;
      continue;
    }
    if (part.trim() === '') {
      continue;
    }

    const value = parseLength(part);
    if (value === null) {
      return null;
    }
    total += sign * value;
    sign = 1;
    sawTerm = true;
  }

  return sawTerm ? total : null;
}

/** Rounds inches to the nearest 1/denominator and reduces the fraction. */
export function toFraction(inches: number, denominator: number): Fraction {
  const negative = inches < 0;
  const steps = Math.round(Math.abs(inches) * denominator);
  let numerator = steps % denominator;
  let den = denominator;
  while (numerator > 0 && numerator % 2 === 0) {
    numerator /= 2;
    den /= 2;
  }

  return {
    negative: negative && steps > 0,
    whole: Math.floor(steps / denominator),
    numerator,
    denominator: numerator === 0 ? 1 : den,
    error: inches - (negative ? -steps : steps) / denominator,
  };
}

export function formatFraction(fraction: Fraction): string {
  const sign = fraction.negative ? '−' : '';
  if (fraction.numerator === 0) {
    return `${sign}${fraction.whole}″`;
  }
  const part = `${fraction.numerator}/${fraction.denominator}`;
  return fraction.whole === 0 ? `${sign}${part}″` : `${sign}${fraction.whole} ${part}″`;
}

export const PRECISIONS = [8, 16, 32, 64];

@Component({
  selector: 'app-inch-fraction-converter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inch-fraction-converter.html',
  styleUrl: './inch-fraction-converter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InchFractionConverterComponent {
  input = '3 5/8 + 1 3/16';
  precision = 16;
  readonly precisions = PRECISIONS;

  /** 1/16 through 1, the marks on a standard tape measure. */
  readonly chart = Array.from({ length: 16 }, (_, i) => {
    const inches = (i + 1) / 16;
    return {
      fraction: formatFraction(toFraction(inches, 16)),
      decimal: inches.toFixed(4),
      mm: (inches * MM_PER_INCH).toFixed(2),
    };
  });

  get inches(): number | null {
    return evaluateLengths(this.input);
  }

  get errorMessage(): string | null {
    if (this.input.trim() === '' || this.inches !== null) {
      return null;
    }
    return 'Couldn\'t read that. Try 3 5/8, 3.625, 92 mm, or 5\' 3 1/2", joined with + or -.';
  }

  get fraction(): Fraction | null {
    const inches = this.inches;
    return inches === null ? null : toFraction(inches, this.precision);
  }

  get fractionLabel(): string {
    return this.fraction ? formatFraction(this.fraction) : '';
  }

  /** Shown only when rounding to the chosen mark actually moved the value. */
  get roundingNote(): string | null {
    const error = this.fraction?.error ?? 0;
    if (Math.abs(error) < 0.0005) {
      return null;
    }
    return `exact is ${Math.abs(error).toFixed(3)}″ ${error > 0 ? 'longer' : 'shorter'}`;
  }

  get decimalLabel(): string {
    return `${parseFloat((this.inches ?? 0).toFixed(4))}″`;
  }

  get feetLabel(): string | null {
    const inches = this.inches;
    if (inches === null || Math.abs(inches) < 12) {
      return null;
    }

    const fraction = toFraction(Math.abs(inches), this.precision);
    const feet = Math.floor(fraction.whole / 12);
    const rest = formatFraction({ ...fraction, whole: fraction.whole - feet * 12, negative: false });
    return `${inches < 0 ? '−' : ''}${feet}′ ${rest}`;
  }

  get mmLabel(): string {
    return `${((this.inches ?? 0) * MM_PER_INCH).toFixed(2)} mm`;
  }

  get cmLabel(): string {
    return `${((this.inches ?? 0) * MM_PER_INCH / 10).toFixed(2)} cm`;
  }
}
