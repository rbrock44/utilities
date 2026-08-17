import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CaseResult {
  key: string;
  label: string;
  value: string;
}

interface Counts {
  characters: number;
  withoutSpaces: number;
  words: number;
  lines: number;
  bytes: number;
}

@Component({
  selector: 'app-text-case-converter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './text-case-converter.html',
  styleUrl: './text-case-converter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextCaseConverterComponent implements OnDestroy {
  input = '';
  results: CaseResult[] = [];
  counts: Counts = { characters: 0, withoutSpaces: 0, words: 0, lines: 0, bytes: 0 };
  copiedKey: string | null = null;

  private computeTimeout: ReturnType<typeof setTimeout> | null = null;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    if (this.computeTimeout) {
      clearTimeout(this.computeTimeout);
    }
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
  }

  get hasInput(): boolean {
    return this.input !== '';
  }

  onInputChange(): void {
    if (this.computeTimeout) {
      clearTimeout(this.computeTimeout);
    }
    this.computeTimeout = setTimeout(() => this.compute(), 150);
  }

  compute(): void {
    this.counts = this.count(this.input);

    if (this.input.trim() === '') {
      this.results = [];
      this.cdr.markForCheck();
      return;
    }

    const words = this.tokenize(this.input);

    this.results = [
      { key: 'lower', label: 'lowercase', value: this.input.toLowerCase() },
      { key: 'upper', label: 'UPPERCASE', value: this.input.toUpperCase() },
      { key: 'title', label: 'Title Case', value: this.toTitle(this.input) },
      { key: 'sentence', label: 'Sentence case', value: this.toSentence(this.input) },
      { key: 'camel', label: 'camelCase', value: this.toCamel(words) },
      { key: 'pascal', label: 'PascalCase', value: this.toPascal(words) },
      { key: 'snake', label: 'snake_case', value: this.joinLower(words, '_') },
      { key: 'kebab', label: 'kebab-case', value: this.joinLower(words, '-') },
      { key: 'constant', label: 'CONSTANT_CASE', value: words.map((w) => w.toUpperCase()).join('_') },
      { key: 'slug', label: 'url-slug', value: this.toSlug(this.input) },
    ];

    this.cdr.markForCheck();
  }

  clear(): void {
    this.input = '';
    this.compute();
  }

  async copy(key: string, value: string): Promise<void> {
    if (value === '') {
      return;
    }

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

  private count(text: string): Counts {
    const trimmed = text.trim();

    return {
      // Spread by code point so an emoji counts as one character, not two.
      characters: Array.from(text).length,
      withoutSpaces: Array.from(text.replace(/\s/g, '')).length,
      words: trimmed === '' ? 0 : trimmed.split(/\s+/).length,
      lines: text === '' ? 0 : text.split('\n').length,
      bytes: new TextEncoder().encode(text).length,
    };
  }

  /**
   * Splits on non-alphanumerics and on camelCase humps, so an identifier in
   * any existing convention round-trips into any other.
   */
  private tokenize(text: string): string[] {
    return text
      .replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, '$1 $2')
      .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token !== '');
  }

  private joinLower(words: string[], separator: string): string {
    return words.map((word) => word.toLowerCase()).join(separator);
  }

  private toCamel(words: string[]): string {
    return words
      .map((word, index) =>
        index === 0 ? word.toLowerCase() : this.capitalize(word.toLowerCase())
      )
      .join('');
  }

  private toPascal(words: string[]): string {
    return words.map((word) => this.capitalize(word.toLowerCase())).join('');
  }

  private toSlug(text: string): string {
    // Fold accents so "Héllo Wörld" becomes a clean ASCII slug.
    const folded = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return this.joinLower(this.tokenize(folded), '-');
  }

  private toTitle(text: string): string {
    return text.replace(/\S+/g, (word) => this.capitalize(word.toLowerCase()));
  }

  private toSentence(text: string): string {
    return text
      .toLowerCase()
      .replace(/(^|[.!?]\s+)(\p{L})/gmu, (_, prefix: string, letter: string) =>
        `${prefix}${letter.toUpperCase()}`
      );
  }

  private capitalize(word: string): string {
    return word === '' ? word : word.charAt(0).toUpperCase() + word.slice(1);
  }
}
