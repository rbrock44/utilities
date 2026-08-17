import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toDataURL, toString as toQrString } from 'qrcode';

type ErrorLevel = 'L' | 'M' | 'Q' | 'H';

@Component({
  selector: 'app-qr-code-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-code-generator.html',
  styleUrl: './qr-code-generator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeGeneratorComponent implements OnDestroy {
  readonly errorLevels: { value: ErrorLevel; label: string }[] = [
    { value: 'L', label: 'L — recovers 7%' },
    { value: 'M', label: 'M — recovers 15%' },
    { value: 'Q', label: 'Q — recovers 25%' },
    { value: 'H', label: 'H — recovers 30%' },
  ];

  content = 'https://utilities.ryan-brock.com';
  size = 512;
  margin = 4;
  errorLevel: ErrorLevel = 'M';
  foreground = '#000000';
  background = '#FFFFFF';

  dataUrl: string | null = null;
  svg = '';
  errorMessage: string | null = null;
  isRendering = false;
  justCopied = false;

  private renderTimeout: ReturnType<typeof setTimeout> | null = null;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {
    this.render();
  }

  ngOnDestroy(): void {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
  }

  get hasContent(): boolean {
    return this.content.trim() !== '';
  }

  get byteLength(): number {
    return new TextEncoder().encode(this.content).length;
  }

  scheduleRender(): void {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    this.renderTimeout = setTimeout(() => this.render(), 200);
  }

  async render(): Promise<void> {
    this.errorMessage = null;

    if (!this.hasContent) {
      this.dataUrl = null;
      this.svg = '';
      this.cdr.markForCheck();
      return;
    }

    const options = {
      errorCorrectionLevel: this.errorLevel,
      margin: this.clampedMargin,
      width: this.clampedSize,
      color: { dark: this.foreground, light: this.background },
    };

    this.isRendering = true;
    this.cdr.markForCheck();

    try {
      this.dataUrl = await toDataURL(this.content, options);
      this.svg = await toQrString(this.content, { ...options, type: 'svg' });
    } catch {
      this.dataUrl = null;
      this.svg = '';
      this.errorMessage =
        this.errorLevel === 'L'
          ? 'That is too much data for a QR code. Shorten the text.'
          : 'That is too much data at this error-correction level. Try a lower level, or shorten the text.';
    } finally {
      this.isRendering = false;
      this.cdr.markForCheck();
    }
  }

  downloadPng(): void {
    if (this.dataUrl === null) {
      return;
    }

    const a = document.createElement('a');
    a.href = this.dataUrl;
    a.download = `qr-${this.clampedSize}.png`;
    a.click();
  }

  downloadSvg(): void {
    if (this.svg === '') {
      return;
    }

    const blob = new Blob([this.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qr.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  async copySvg(): Promise<void> {
    if (this.svg === '') {
      return;
    }

    await navigator.clipboard.writeText(this.svg);

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

  onForegroundPicked(event: Event): void {
    this.foreground = (event.target as HTMLInputElement).value.toUpperCase();
    this.scheduleRender();
  }

  onBackgroundPicked(event: Event): void {
    this.background = (event.target as HTMLInputElement).value.toUpperCase();
    this.scheduleRender();
  }

  get clampedSize(): number {
    const value = Math.round(Number(this.size));
    if (!Number.isFinite(value)) {
      return 512;
    }
    return Math.min(2048, Math.max(64, value));
  }

  get clampedMargin(): number {
    const value = Math.round(Number(this.margin));
    if (!Number.isFinite(value)) {
      return 4;
    }
    return Math.min(20, Math.max(0, value));
  }
}
