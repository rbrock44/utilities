import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BaseField {
  base: number;
  label: string;
  id: string;
  placeholder: string;
}

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

@Component({
  selector: 'app-number-base-converter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './number-base-converter.html',
  styleUrl: './number-base-converter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberBaseConverterComponent {
  readonly bases: BaseField[] = [
    { base: 2, label: 'Binary', id: 'baseInput2', placeholder: '1111 1111' },
    { base: 8, label: 'Octal', id: 'baseInput8', placeholder: '377' },
    { base: 10, label: 'Decimal', id: 'baseInput10', placeholder: '255' },
    { base: 16, label: 'Hexadecimal', id: 'baseInput16', placeholder: 'FF' },
  ];

  values: Record<number, string> = { 2: '', 8: '', 10: '', 16: '' };
  value: bigint | null = null;
  errorMessage: string | null = null;
  justCopiedBase: number | null = null;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  get bitLength(): number {
    if (this.value === null) {
      return 0;
    }
    const magnitude = this.value < 0n ? -this.value : this.value;
    return magnitude === 0n ? 1 : magnitude.toString(2).length;
  }

  get byteLength(): number {
    return Math.ceil(this.bitLength / 8);
  }

  get isNegative(): boolean {
    return this.value !== null && this.value < 0n;
  }

  get hasInput(): boolean {
    return this.bases.some((field) => this.values[field.base].trim() !== '');
  }

  onValueChange(base: number): void {
    this.errorMessage = null;
    const raw = this.values[base];

    if (raw.trim() === '') {
      this.value = null;
      this.fillOthers(base, () => '');
      this.cdr.markForCheck();
      return;
    }

    const parsed = this.parse(raw, base);
    if (parsed === null) {
      this.value = null;
      const label = this.bases.find((field) => field.base === base)!.label.toLowerCase();
      this.errorMessage = `"${raw.trim()}" is not a valid ${label} number.`;
      this.fillOthers(base, () => '');
      this.cdr.markForCheck();
      return;
    }

    this.value = parsed;
    this.fillOthers(base, (target) => this.format(parsed, target));
    this.cdr.markForCheck();
  }

  clearAll(): void {
    this.values = { 2: '', 8: '', 10: '', 16: '' };
    this.value = null;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  async copy(base: number): Promise<void> {
    const text = this.values[base];
    if (text === '') {
      return;
    }

    await navigator.clipboard.writeText(text);

    this.justCopiedBase = base;
    this.cdr.markForCheck();

    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
    this.copiedTimeout = setTimeout(() => {
      this.justCopiedBase = null;
      this.cdr.markForCheck();
    }, 2000);
  }

  private fillOthers(source: number, produce: (base: number) => string): void {
    this.bases.forEach((field) => {
      if (field.base !== source) {
        this.values[field.base] = produce(field.base);
      }
    });
  }

  private format(value: bigint, base: number): string {
    const text = value.toString(base);
    return base === 16 ? text.toUpperCase() : text;
  }

  private parse(raw: string, base: number): bigint | null {
    let text = raw.trim().toLowerCase().replace(/[_\s,]/g, '');

    let negative = false;
    if (text.startsWith('-')) {
      negative = true;
      text = text.slice(1);
    } else if (text.startsWith('+')) {
      text = text.slice(1);
    }

    const prefixes: Record<number, string> = { 2: '0b', 8: '0o', 16: '0x' };
    const prefix = prefixes[base];
    if (prefix !== undefined && text.startsWith(prefix)) {
      text = text.slice(2);
    }

    if (text === '') {
      return null;
    }

    const radix = BigInt(base);
    let result = 0n;

    for (const character of text) {
      const digit = DIGITS.indexOf(character);
      if (digit < 0 || digit >= base) {
        return null;
      }
      result = result * radix + BigInt(digit);
    }

    return negative ? -result : result;
  }
}
