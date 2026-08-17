import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Mode = 'text' | 'file';
type Direction = 'encode' | 'decode';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'app-base64-converter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './base64-converter.html',
  styleUrl: './base64-converter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Base64ConverterComponent {
  mode: Mode = 'text';
  direction: Direction = 'encode';
  urlSafe = false;

  input = '';
  output = '';
  errorMessage: string | null = null;
  justCopied = false;

  file: File | null = null;
  fileSize = 0;
  isDragging = false;
  isReading = false;
  includeDataUri = true;
  private dataUri = '';
  private rawBase64 = '';

  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  setMode(mode: Mode): void {
    this.mode = mode;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  get result(): string {
    return this.mode === 'text' ? this.output : this.fileOutput;
  }

  async copyResult(): Promise<void> {
    const text = this.result;
    if (text === '') {
      return;
    }

    await navigator.clipboard.writeText(text);

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

  setDirection(direction: Direction): void {
    this.direction = direction;
    this.convert();
  }

  convert(): void {
    this.errorMessage = null;

    if (this.input === '') {
      this.output = '';
      this.cdr.markForCheck();
      return;
    }

    if (this.direction === 'encode') {
      this.output = this.applyUrlSafe(this.encodeText(this.input));
      this.cdr.markForCheck();
      return;
    }

    let bytes: Uint8Array;
    try {
      bytes = this.base64ToBytes(this.input);
    } catch {
      this.output = '';
      this.errorMessage = "That doesn't look like valid Base64.";
      this.cdr.markForCheck();
      return;
    }

    try {
      this.output = new TextDecoder('utf-8', { fatal: true }).decode(bytes as BufferSource);
    } catch {
      this.output = '';
      this.errorMessage =
        'Those bytes decoded, but they are not valid UTF-8 text. The input looks like binary data.';
    }

    this.cdr.markForCheck();
  }

  swap(): void {
    if (this.output === '' || this.errorMessage !== null) {
      return;
    }

    this.input = this.output;
    this.direction = this.direction === 'encode' ? 'decode' : 'encode';
    this.convert();
  }

  clearText(): void {
    this.input = '';
    this.output = '';
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.readFile(file);
    }

    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(): void {
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.readFile(file);
    }
  }

  clearFile(): void {
    this.file = null;
    this.fileSize = 0;
    this.dataUri = '';
    this.rawBase64 = '';
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  get fileOutput(): string {
    if (this.rawBase64 === '') {
      return '';
    }

    return this.includeDataUri ? this.dataUri : this.applyUrlSafe(this.rawBase64);
  }

  get fileSizeLabel(): string {
    return this.formatBytes(this.fileSize);
  }

  get encodedSizeLabel(): string {
    return this.formatBytes(this.fileOutput.length);
  }

  private readFile(file: File): void {
    this.clearFile();

    if (file.size > MAX_FILE_BYTES) {
      this.errorMessage = `That file is ${this.formatBytes(file.size)}. Files over ${this.formatBytes(
        MAX_FILE_BYTES
      )} are too large to encode in the browser.`;
      this.cdr.markForCheck();
      return;
    }

    this.file = file;
    this.fileSize = file.size;
    this.isReading = true;
    this.cdr.markForCheck();

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      this.dataUri = result;
      this.rawBase64 = result.slice(result.indexOf(',') + 1);
      this.isReading = false;
      this.cdr.markForCheck();
    };

    reader.onerror = () => {
      this.file = null;
      this.fileSize = 0;
      this.isReading = false;
      this.errorMessage = 'Could not read that file.';
      this.cdr.markForCheck();
    };

    reader.readAsDataURL(file);
  }

  private encodeText(text: string): string {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary);
  }

  private base64ToBytes(text: string): Uint8Array {
    let normalized = text
      .trim()
      .replace(/\s/g, '')
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .replace(/=+$/, '');

    if (normalized === '' || !/^[A-Za-z0-9+/]*$/.test(normalized)) {
      throw new Error('invalid base64');
    }

    const remainder = normalized.length % 4;
    if (remainder === 1) {
      throw new Error('invalid base64 length');
    }

    if (remainder > 0) {
      normalized += '='.repeat(4 - remainder);
    }

    const binary = atob(normalized);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  private applyUrlSafe(encoded: string): string {
    if (!this.urlSafe) {
      return encoded;
    }

    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
