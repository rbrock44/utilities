import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Granularity = 'line' | 'word';

interface DiffRow {
  kind: 'same' | 'added' | 'removed';
  leftNumber: number | null;
  rightNumber: number | null;
  text: string;
}

interface DiffSummary {
  added: number;
  removed: number;
  unchanged: number;
}

const MAX_UNITS = 4000;

@Component({
  selector: 'app-text-diff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './text-diff.html',
  styleUrl: './text-diff.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextDiffComponent implements OnDestroy {
  original = '';
  changed = '';
  granularity: Granularity = 'line';
  ignoreCase = false;
  ignoreWhitespace = false;
  hideUnchanged = false;

  rows: DiffRow[] = [];
  summary: DiffSummary = { added: 0, removed: 0, unchanged: 0 };
  errorMessage: string | null = null;
  hasCompared = false;

  private computeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    if (this.computeTimeout) {
      clearTimeout(this.computeTimeout);
    }
  }

  get hasInput(): boolean {
    return this.original !== '' || this.changed !== '';
  }

  get identical(): boolean {
    return this.hasCompared && this.summary.added === 0 && this.summary.removed === 0;
  }

  get visibleRows(): DiffRow[] {
    return this.hideUnchanged ? this.rows.filter((row) => row.kind !== 'same') : this.rows;
  }

  onInputChange(): void {
    if (this.computeTimeout) {
      clearTimeout(this.computeTimeout);
    }
    this.computeTimeout = setTimeout(() => this.compare(), 200);
  }

  compare(): void {
    this.errorMessage = null;
    this.rows = [];
    this.summary = { added: 0, removed: 0, unchanged: 0 };
    this.hasCompared = false;

    if (!this.hasInput) {
      this.cdr.markForCheck();
      return;
    }

    const left = this.split(this.original);
    const right = this.split(this.changed);

    if (left.length > MAX_UNITS || right.length > MAX_UNITS) {
      this.errorMessage = `That is too much to diff at once — keep each side under ${MAX_UNITS} ${
        this.granularity === 'line' ? 'lines' : 'words'
      }.`;
      this.cdr.markForCheck();
      return;
    }

    this.rows = this.buildRows(left, right);
    this.summary = {
      added: this.rows.filter((row) => row.kind === 'added').length,
      removed: this.rows.filter((row) => row.kind === 'removed').length,
      unchanged: this.rows.filter((row) => row.kind === 'same').length,
    };
    this.hasCompared = true;
    this.cdr.markForCheck();
  }

  swap(): void {
    const previous = this.original;
    this.original = this.changed;
    this.changed = previous;
    this.compare();
  }

  clear(): void {
    this.original = '';
    this.changed = '';
    this.compare();
  }

  private split(text: string): string[] {
    if (text === '') {
      return [];
    }
    return this.granularity === 'line' ? text.split('\n') : text.split(/(\s+)/).filter((t) => t.trim() !== '');
  }

  /**
   * Comparison key, so "ignore case" and "ignore whitespace" affect matching
   * without changing the text that gets displayed.
   */
  private key(unit: string): string {
    let value = unit;
    if (this.ignoreWhitespace) {
      value = value.trim().replace(/\s+/g, ' ');
    }
    if (this.ignoreCase) {
      value = value.toLowerCase();
    }
    return value;
  }

  /**
   * Classic longest-common-subsequence table. O(n*m) in both time and memory,
   * which is why MAX_UNITS caps the input.
   */
  private lcsTable(left: string[], right: string[]): number[][] {
    const table: number[][] = Array.from({ length: left.length + 1 }, () =>
      new Array<number>(right.length + 1).fill(0)
    );

    for (let i = left.length - 1; i >= 0; i--) {
      for (let j = right.length - 1; j >= 0; j--) {
        table[i][j] =
          this.key(left[i]) === this.key(right[j])
            ? table[i + 1][j + 1] + 1
            : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }

    return table;
  }

  private buildRows(left: string[], right: string[]): DiffRow[] {
    const table = this.lcsTable(left, right);
    const rows: DiffRow[] = [];

    let i = 0;
    let j = 0;

    while (i < left.length && j < right.length) {
      if (this.key(left[i]) === this.key(right[j])) {
        rows.push({ kind: 'same', leftNumber: i + 1, rightNumber: j + 1, text: right[j] });
        i++;
        j++;
      } else if (table[i + 1][j] >= table[i][j + 1]) {
        rows.push({ kind: 'removed', leftNumber: i + 1, rightNumber: null, text: left[i] });
        i++;
      } else {
        rows.push({ kind: 'added', leftNumber: null, rightNumber: j + 1, text: right[j] });
        j++;
      }
    }

    while (i < left.length) {
      rows.push({ kind: 'removed', leftNumber: i + 1, rightNumber: null, text: left[i] });
      i++;
    }

    while (j < right.length) {
      rows.push({ kind: 'added', leftNumber: null, rightNumber: j + 1, text: right[j] });
      j++;
    }

    return rows;
  }
}
