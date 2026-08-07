import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-hex-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hex-generator.html',
  styleUrl: './hex-generator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HexGeneratorComponent implements OnInit {
  digits = 8;
  count = 1;
  results: string[] = [];
  justCopiedIndex: number | null = null;
  justCopiedAll = false;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;
  private copiedAllTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.generate();
  }

  get normalizedDigits(): number {
    if (!Number.isFinite(this.digits) || this.digits < 1) {
      return 1;
    }
    return Math.floor(this.digits);
  }

  get normalizedCount(): number {
    if (!Number.isFinite(this.count) || this.count < 1) {
      return 1;
    }
    return Math.floor(this.count);
  }

  generate(): void {
    const digits = this.normalizedDigits;
    const count = this.normalizedCount;
    const results: string[] = [];

    for (let i = 0; i < count; i++) {
      results.push(this.randomHex(digits));
    }

    this.results = results;
    this.cdr.markForCheck();
  }

  async copyToClipboard(value: string, index: number): Promise<void> {
    await navigator.clipboard.writeText(value);

    this.justCopiedIndex = index;
    this.cdr.markForCheck();

    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
    this.copiedTimeout = setTimeout(() => {
      this.justCopiedIndex = null;
      this.cdr.markForCheck();
    }, 2000);
  }

  async copyAllToClipboard(): Promise<void> {
    if (this.results.length === 0) {
      return;
    }

    await navigator.clipboard.writeText(this.results.join('\n'));

    this.justCopiedAll = true;
    this.cdr.markForCheck();

    if (this.copiedAllTimeout) {
      clearTimeout(this.copiedAllTimeout);
    }
    this.copiedAllTimeout = setTimeout(() => {
      this.justCopiedAll = false;
      this.cdr.markForCheck();
    }, 2000);
  }

  private randomHex(digits: number): string {
    const bytes = new Uint8Array(Math.ceil(digits / 2));
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, digits);
  }
}
