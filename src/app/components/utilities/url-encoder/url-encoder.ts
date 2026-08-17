import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Mode = 'text' | 'inspect';
type Direction = 'encode' | 'decode';
type Scope = 'component' | 'full';

interface UrlPart {
  label: string;
  value: string;
}

interface QueryParam {
  key: string;
  value: string;
}

@Component({
  selector: 'app-url-encoder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './url-encoder.html',
  styleUrl: './url-encoder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UrlEncoderComponent implements OnDestroy {
  mode: Mode = 'text';

  /* Encode / decode */
  direction: Direction = 'encode';
  scope: Scope = 'component';
  plusAsSpace = true;
  text = '';
  textOutput = '';
  textError: string | null = null;

  /* Inspect */
  urlInput = '';
  urlError: string | null = null;
  assumedProtocol = false;
  parts: UrlPart[] = [];
  params: QueryParam[] = [];

  justCopied = false;
  private base: URL | null = null;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.cdr.markForCheck();
  }

  setDirection(direction: Direction): void {
    this.direction = direction;
    this.convert();
  }

  convert(): void {
    this.textError = null;

    if (this.text === '') {
      this.textOutput = '';
      this.cdr.markForCheck();
      return;
    }

    try {
      if (this.direction === 'encode') {
        this.textOutput =
          this.scope === 'component' ? encodeURIComponent(this.text) : encodeURI(this.text);
      } else {
        const prepared = this.plusAsSpace ? this.text.replace(/\+/g, ' ') : this.text;
        this.textOutput =
          this.scope === 'component' ? decodeURIComponent(prepared) : decodeURI(prepared);
      }
    } catch {
      this.textOutput = '';
      this.textError =
        'That is not valid percent-encoding — look for a stray % or an incomplete escape like %E0%A4.';
    }

    this.cdr.markForCheck();
  }

  swap(): void {
    if (this.textOutput === '' || this.textError !== null) {
      return;
    }
    this.text = this.textOutput;
    this.direction = this.direction === 'encode' ? 'decode' : 'encode';
    this.convert();
  }

  clearText(): void {
    this.text = '';
    this.textOutput = '';
    this.textError = null;
    this.cdr.markForCheck();
  }

  parseUrl(): void {
    this.urlError = null;
    this.assumedProtocol = false;
    this.parts = [];
    this.params = [];
    this.base = null;

    const text = this.urlInput.trim();
    if (text === '') {
      this.cdr.markForCheck();
      return;
    }

    let url = this.tryUrl(text);

    if (url === null && !/^[a-z][a-z0-9+.-]*:/i.test(text)) {
      url = this.tryUrl(`https://${text}`);
      this.assumedProtocol = url !== null;
    }

    if (url === null) {
      this.urlError = 'That could not be read as a URL.';
      this.cdr.markForCheck();
      return;
    }

    this.base = url;
    this.parts = [
      { label: 'Protocol', value: url.protocol.replace(/:$/, '') },
      { label: 'Host', value: url.hostname },
      { label: 'Port', value: url.port },
      { label: 'Path', value: url.pathname },
      { label: 'Fragment', value: url.hash.replace(/^#/, '') },
    ].filter((part) => part.value !== '');

    this.params = Array.from(url.searchParams.entries()).map(([key, value]) => ({ key, value }));
    this.cdr.markForCheck();
  }

  get rebuiltUrl(): string {
    if (this.base === null) {
      return '';
    }

    const url = new URL(this.base.toString());
    const search = new URLSearchParams();

    for (const param of this.params) {
      if (param.key.trim() !== '') {
        search.append(param.key, param.value);
      }
    }

    const query = search.toString();
    url.search = query === '' ? '' : `?${query}`;
    return url.toString();
  }

  get changedFromInput(): boolean {
    return this.base !== null && this.rebuiltUrl !== this.urlInput.trim();
  }

  addParam(): void {
    this.params = [...this.params, { key: '', value: '' }];
    this.cdr.markForCheck();
  }

  removeParam(index: number): void {
    this.params = this.params.filter((_, position) => position !== index);
    this.cdr.markForCheck();
  }

  onParamChange(): void {
    this.cdr.markForCheck();
  }

  applyRebuilt(): void {
    if (this.base === null) {
      return;
    }
    this.urlInput = this.rebuiltUrl;
    this.parseUrl();
  }

  clearUrl(): void {
    this.urlInput = '';
    this.parseUrl();
  }

  get result(): string {
    return this.mode === 'text' ? this.textOutput : this.rebuiltUrl;
  }

  async copyResult(): Promise<void> {
    const value = this.result;
    if (value === '') {
      return;
    }

    await navigator.clipboard.writeText(value);

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

  private tryUrl(text: string): URL | null {
    try {
      return new URL(text);
    } catch {
      return null;
    }
  }
}
