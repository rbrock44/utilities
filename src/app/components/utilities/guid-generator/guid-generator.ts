import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type UuidVersion = 4 | 7;

export interface V7State {
  lastMs: number;
  counter: number;
}

/**
 * UUID v7 (RFC 9562): a 48-bit Unix millisecond timestamp, then random bits. The 12 bits
 * after the version hold a counter (RFC 9562 §6.2, method 1) that steps within the same
 * millisecond, so a batch generated at once still sorts in creation order. The counter is
 * seeded with 11 random bits to leave headroom; if it does overflow, the timestamp borrows
 * the next millisecond rather than going backwards.
 */
export function uuidV7(now: number, state: V7State): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  let ms = Math.max(now, state.lastMs);
  if (ms === state.lastMs) {
    state.counter++;
    if (state.counter > 0xfff) {
      ms++;
      state.counter = ((bytes[6] & 0x07) << 8) | bytes[7];
    }
  } else {
    state.counter = ((bytes[6] & 0x07) << 8) | bytes[7];
  }
  state.lastMs = ms;

  // 48 bits doesn't fit a 32-bit bitwise op, so peel bytes off with division.
  let remaining = ms;
  for (let i = 5; i >= 0; i--) {
    bytes[i] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }
  bytes[6] = 0x70 | (state.counter >> 8);
  bytes[7] = state.counter & 0xff;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The creation time embedded in a v7 UUID. */
export function uuidV7Time(uuid: string): Date {
  return new Date(parseInt(uuid.replace(/-/g, '').slice(0, 12), 16));
}

@Component({
  selector: 'app-guid-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guid-generator.html',
  styleUrl: './guid-generator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidGeneratorComponent implements OnInit {
  count = 1;
  version: UuidVersion = 4;
  results: string[] = [];
  private readonly v7State: V7State = { lastMs: -1, counter: 0 };
  justCopiedIndex: number | null = null;
  justCopiedAll = false;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;
  private copiedAllTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.generate();
  }

  get normalizedCount(): number {
    if (!Number.isFinite(this.count) || this.count < 1) {
      return 1;
    }
    return Math.floor(this.count);
  }

  get createdAt(): string | null {
    if (this.version !== 7 || this.results.length === 0) {
      return null;
    }
    return uuidV7Time(this.results[0]).toLocaleString();
  }

  generate(): void {
    const count = this.normalizedCount;
    const results: string[] = [];

    for (let i = 0; i < count; i++) {
      results.push(this.version === 7 ? uuidV7(Date.now(), this.v7State) : crypto.randomUUID());
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
}
