import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type IndentChoice = '2' | '4' | 'tab';

interface Stats {
  bytes: number;
  keys: number;
  depth: number;
  type: string;
}

interface ParseFailure {
  message: string;
  line: number;
  column: number;
  snippet: string;
}

@Component({
  selector: 'app-json-formatter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './json-formatter.html',
  styleUrl: './json-formatter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonFormatterComponent implements OnDestroy {
  input = '';
  indent: IndentChoice = '2';
  sortKeys = false;

  isValid = false;
  failure: ParseFailure | null = null;
  stats: Stats | null = null;
  justCopied = false;

  private parsed: unknown = undefined;
  private validateTimeout: ReturnType<typeof setTimeout> | null = null;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    if (this.validateTimeout) {
      clearTimeout(this.validateTimeout);
    }
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
  }

  get hasInput(): boolean {
    return this.input.trim() !== '';
  }

  onInputChange(): void {
    if (this.validateTimeout) {
      clearTimeout(this.validateTimeout);
    }
    this.validateTimeout = setTimeout(() => this.validate(), 200);
  }

  validate(): void {
    this.failure = null;
    this.isValid = false;
    this.stats = null;
    this.parsed = undefined;

    if (!this.hasInput) {
      this.cdr.markForCheck();
      return;
    }

    try {
      this.parsed = JSON.parse(this.input);
    } catch (error) {
      this.failure = this.describe(error as Error);
      this.cdr.markForCheck();
      return;
    }

    this.isValid = true;
    this.stats = {
      bytes: new TextEncoder().encode(this.input).length,
      keys: this.countKeys(this.parsed),
      depth: this.depthOf(this.parsed),
      type: this.typeOf(this.parsed),
    };
    this.cdr.markForCheck();
  }

  format(): void {
    this.validate();
    if (!this.isValid) {
      return;
    }

    const value = this.sortKeys ? this.withSortedKeys(this.parsed) : this.parsed;
    const indent = this.indent === 'tab' ? '\t' : Number(this.indent);

    this.input = JSON.stringify(value, null, indent);
    this.validate();
  }

  minify(): void {
    this.validate();
    if (!this.isValid) {
      return;
    }

    const value = this.sortKeys ? this.withSortedKeys(this.parsed) : this.parsed;
    this.input = JSON.stringify(value);
    this.validate();
  }

  clear(): void {
    this.input = '';
    this.validate();
  }

  async copy(): Promise<void> {
    if (!this.hasInput) {
      return;
    }

    await navigator.clipboard.writeText(this.input);

    this.justCopied = true;
    this.cdr.markForCheck();

    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
    this.copiedTimeout = setTimeout(() => {
      this.justCopied = false;
      this.cdr.markForCheck();
    }, 2000);
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Turns a SyntaxError into a line/column plus the offending line with a
   * caret under it. Engines report a character offset (and not always that),
   * which is useless against a wrapped textarea.
   */
  private describe(error: Error): ParseFailure {
    const message = error.message.replace(/\s*in JSON at position.*$/, '');
    const match = /position (\d+)/.exec(error.message);

    if (match === null) {
      return { message, line: 0, column: 0, snippet: '' };
    }

    const position = Math.min(Number(match[1]), Math.max(0, this.input.length - 1));
    const before = this.input.slice(0, position);
    const line = before.split('\n').length;
    const lineStart = before.lastIndexOf('\n') + 1;
    const column = position - lineStart + 1;

    const lineEnd = this.input.indexOf('\n', lineStart);
    const text = this.input.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);

    // Keep long lines readable by windowing around the offending column.
    const windowStart = Math.max(0, column - 40);
    const visible = text.slice(windowStart, windowStart + 80);
    const caretOffset = column - 1 - windowStart;

    return {
      message,
      line,
      column,
      snippet: `${visible}\n${' '.repeat(Math.max(0, caretOffset))}^`,
    };
  }

  private withSortedKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.withSortedKeys(entry));
    }

    if (value !== null && typeof value === 'object') {
      const source = value as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(source).sort()) {
        sorted[key] = this.withSortedKeys(source[key]);
      }
      return sorted;
    }

    return value;
  }

  private countKeys(value: unknown): number {
    if (Array.isArray(value)) {
      return value.reduce<number>((total, entry) => total + this.countKeys(entry), 0);
    }

    if (value !== null && typeof value === 'object') {
      const source = value as Record<string, unknown>;
      const keys = Object.keys(source);
      return keys.reduce<number>((total, key) => total + this.countKeys(source[key]), keys.length);
    }

    return 0;
  }

  private depthOf(value: unknown): number {
    const children = Array.isArray(value)
      ? value
      : value !== null && typeof value === 'object'
        ? Object.values(value as Record<string, unknown>)
        : null;

    if (children === null) {
      return 0;
    }

    let deepest = 0;
    for (const child of children) {
      const childDepth = this.depthOf(child);
      if (childDepth > deepest) {
        deepest = childDepth;
      }
    }

    return deepest + 1;
  }

  private typeOf(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (Array.isArray(value)) {
      return `array of ${value.length}`;
    }
    return typeof value;
  }
}
