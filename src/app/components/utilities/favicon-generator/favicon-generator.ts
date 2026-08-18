import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Bytes, buildZip, ZipEntry } from '../../../services/zip';

interface IconSize {
  size: number;
  fileName: string;
  label: string;
  selected: boolean;
}

interface RenderedIcon {
  size: number;
  fileName: string;
  label: string;
  bytes: Bytes;
  url: string;
}

const MAX_FILE_BYTES = 25 * 1024 * 1024;
/** Everything is downscaled from one square render at this size. */
const BASE_SIZE = 512;
/** The sizes Windows pulls out of a .ico; the rest ship as standalone PNGs. */
const ICO_SIZES = [16, 32, 48];

@Component({
  selector: 'app-favicon-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './favicon-generator.html',
  styleUrl: './favicon-generator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaviconGeneratorComponent implements OnDestroy {
  file: File | null = null;
  isDragging = false;
  isRendering = false;
  errorMessage: string | null = null;

  sizes: IconSize[] = [
    { size: 16, fileName: 'favicon-16x16.png', label: 'Browser tab', selected: true },
    { size: 32, fileName: 'favicon-32x32.png', label: 'Bookmarks bar', selected: true },
    { size: 48, fileName: 'favicon-48x48.png', label: 'Windows site icon', selected: true },
    { size: 180, fileName: 'apple-touch-icon.png', label: 'iOS home screen', selected: true },
    { size: 192, fileName: 'android-chrome-192x192.png', label: 'Android home screen', selected: true },
    { size: 512, fileName: 'android-chrome-512x512.png', label: 'PWA splash screen', selected: true },
  ];

  transparent = true;
  backgroundColor = '#ffffff';
  padding = 0;
  cornerRadius = 0;
  appName = '';

  icons: RenderedIcon[] = [];
  icoBytes: Bytes | null = null;
  copiedKey: string | null = null;

  private image: HTMLImageElement | null = null;
  private sourceUrl: string | null = null;
  private icoUrl: string | null = null;
  private zipUrl: string | null = null;
  private renderTimeout: ReturnType<typeof setTimeout> | null = null;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    this.releaseUrls();
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.loadFile(file);
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
    const file = Array.from(event.dataTransfer?.files ?? []).find((candidate) =>
      candidate.type.startsWith('image/')
    );
    if (file) {
      this.loadFile(file);
    } else {
      this.errorMessage = 'That is not an image file.';
      this.cdr.markForCheck();
    }
  }

  clear(): void {
    this.releaseUrls();
    this.file = null;
    this.image = null;
    this.icons = [];
    this.icoBytes = null;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  toggleSize(entry: IconSize): void {
    entry.selected = !entry.selected;
    this.scheduleRender();
  }

  scheduleRender(): void {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    this.renderTimeout = setTimeout(() => this.render(), 150);
    this.cdr.markForCheck();
  }

  get sourceIsSquare(): boolean {
    return this.image === null || this.image.naturalWidth === this.image.naturalHeight;
  }

  get sourceIsSmall(): boolean {
    return (
      this.image !== null &&
      Math.max(this.image.naturalWidth, this.image.naturalHeight) < 256
    );
  }

  get sourceDimensions(): string {
    return this.image === null
      ? ''
      : `${this.image.naturalWidth} × ${this.image.naturalHeight}`;
  }

  get hasSelection(): boolean {
    return this.sizes.some((entry) => entry.selected);
  }

  get totalBytes(): number {
    return this.icons.reduce((sum, icon) => sum + icon.bytes.length, 0) +
      (this.icoBytes?.length ?? 0);
  }

  get htmlSnippet(): string {
    const lines = ['<link rel="icon" href="/favicon.ico" sizes="any" />'];
    for (const entry of this.sizes) {
      if (!entry.selected) {
        continue;
      }
      if (entry.size === 180) {
        lines.push(`<link rel="apple-touch-icon" href="/${entry.fileName}" />`);
      } else if (entry.size <= 48) {
        lines.push(
          `<link rel="icon" type="image/png" sizes="${entry.size}x${entry.size}" href="/${entry.fileName}" />`
        );
      }
    }
    lines.push('<link rel="manifest" href="/site.webmanifest" />');
    return lines.join('\n');
  }

  get manifestJson(): string {
    const icons = this.sizes
      .filter((entry) => entry.selected && entry.size >= 192)
      .map((entry) => ({
        src: `/${entry.fileName}`,
        sizes: `${entry.size}x${entry.size}`,
        type: 'image/png',
      }));

    const name = this.appName.trim();
    return JSON.stringify(
      {
        name: name || 'My site',
        short_name: name || 'My site',
        icons,
        theme_color: this.transparent ? '#ffffff' : this.backgroundColor,
        background_color: this.transparent ? '#ffffff' : this.backgroundColor,
        display: 'standalone',
      },
      null,
      2
    );
  }

  formatBytes(bytes: number): string {
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  }

  downloadIcon(icon: RenderedIcon): void {
    this.triggerDownload(icon.url, icon.fileName);
  }

  downloadIco(): void {
    if (this.icoUrl !== null) {
      this.triggerDownload(this.icoUrl, 'favicon.ico');
    }
  }

  downloadZip(): void {
    if (this.icons.length === 0) {
      return;
    }

    const entries: ZipEntry[] = this.icons.map((icon) => ({
      name: icon.fileName,
      bytes: icon.bytes,
    }));
    if (this.icoBytes !== null) {
      entries.unshift({ name: 'favicon.ico', bytes: this.icoBytes });
    }
    entries.push({
      name: 'site.webmanifest',
      bytes: new TextEncoder().encode(this.manifestJson),
    });
    entries.push({
      name: 'head-snippet.html',
      bytes: new TextEncoder().encode(`${this.htmlSnippet}\n`),
    });

    // Held until the next zip or teardown: revoking straight after the click races the
    // download in Safari.
    if (this.zipUrl !== null) {
      URL.revokeObjectURL(this.zipUrl);
    }
    this.zipUrl = URL.createObjectURL(
      new Blob([buildZip(entries)], { type: 'application/zip' })
    );
    this.triggerDownload(this.zipUrl, 'favicon-pack.zip');
  }

  async copy(key: string, value: string): Promise<void> {
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

  /**
   * Windows reads a .ico as a directory of images. Every entry here is a PNG, which
   * Vista and later accept at any size and which keeps the alpha channel intact — the
   * older BMP entry format needs a hand-built AND mask.
   */
  buildIco(entries: { size: number; bytes: Bytes }[]): Bytes {
    const headerBytes = 6 + entries.length * 16;
    const total = entries.reduce((sum, entry) => sum + entry.bytes.length, headerBytes);
    const out = new Uint8Array(total);
    const view = new DataView(out.buffer);

    view.setUint16(2, 1, true);
    view.setUint16(4, entries.length, true);

    let offset = headerBytes;
    entries.forEach((entry, index) => {
      const at = 6 + index * 16;
      // 256px is stored as 0 because the field is a single byte.
      out[at] = entry.size >= 256 ? 0 : entry.size;
      out[at + 1] = entry.size >= 256 ? 0 : entry.size;
      view.setUint16(at + 4, 1, true);
      view.setUint16(at + 6, 32, true);
      view.setUint32(at + 8, entry.bytes.length, true);
      view.setUint32(at + 12, offset, true);
      out.set(entry.bytes, offset);
      offset += entry.bytes.length;
    });

    return out;
  }

  private triggerDownload(url: string, fileName: string): void {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
  }

  private loadFile(file: File): void {
    this.clear();

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'That is not an image file.';
      this.cdr.markForCheck();
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      this.errorMessage = `That image is ${this.formatBytes(
        file.size
      )}. The limit is 25.0 MB.`;
      this.cdr.markForCheck();
      return;
    }

    this.file = file;
    this.sourceUrl = URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {
      this.image = image;
      this.render();
    };

    image.onerror = () => {
      this.file = null;
      this.errorMessage = 'That image could not be decoded.';
      this.cdr.markForCheck();
    };

    image.src = this.sourceUrl;
  }

  private async render(): Promise<void> {
    if (this.image === null) {
      return;
    }

    this.isRendering = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      const base = this.drawBase();
      if (base === null) {
        throw new Error('no 2d context');
      }

      const wanted = new Set(this.sizes.filter((entry) => entry.selected).map((e) => e.size));
      // The .ico always carries all three of its sizes, even ones left unchecked.
      for (const size of ICO_SIZES) {
        wanted.add(size);
      }

      const encoded = new Map<number, Bytes>();
      for (const size of [...wanted].sort((a, b) => a - b)) {
        const blob = await this.encode(base, size);
        encoded.set(size, new Uint8Array(await blob.arrayBuffer()));
      }

      const icons: RenderedIcon[] = this.sizes
        .filter((entry) => entry.selected)
        .map((entry) => {
          const bytes = encoded.get(entry.size)!;
          return {
            size: entry.size,
            fileName: entry.fileName,
            label: entry.label,
            bytes,
            url: URL.createObjectURL(new Blob([bytes], { type: 'image/png' })),
          };
        });

      const ico = this.buildIco(
        ICO_SIZES.map((size) => ({ size, bytes: encoded.get(size)! }))
      );

      this.releaseOutputUrls();
      this.icons = icons;
      this.icoBytes = ico;
      this.icoUrl = URL.createObjectURL(new Blob([ico], { type: 'image/x-icon' }));
    } catch {
      this.errorMessage = 'This browser could not render that image to a canvas.';
    } finally {
      this.isRendering = false;
      this.cdr.markForCheck();
    }
  }

  private drawBase(): HTMLCanvasElement | null {
    const canvas = document.createElement('canvas');
    canvas.width = BASE_SIZE;
    canvas.height = BASE_SIZE;

    const context = canvas.getContext('2d');
    if (context === null || this.image === null) {
      return null;
    }

    const radius = (Number(this.cornerRadius) / 100) * (BASE_SIZE / 2);
    if (radius > 0) {
      context.beginPath();
      context.roundRect(0, 0, BASE_SIZE, BASE_SIZE, radius);
      context.clip();
    }

    if (!this.transparent) {
      context.fillStyle = this.backgroundColor;
      context.fillRect(0, 0, BASE_SIZE, BASE_SIZE);
    }

    const inset = (Number(this.padding) / 100) * BASE_SIZE;
    const box = BASE_SIZE - inset * 2;
    const scale = Math.min(
      box / this.image.naturalWidth,
      box / this.image.naturalHeight
    );
    const width = this.image.naturalWidth * scale;
    const height = this.image.naturalHeight * scale;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      this.image,
      (BASE_SIZE - width) / 2,
      (BASE_SIZE - height) / 2,
      width,
      height
    );

    return canvas;
  }

  /**
   * Halves the source repeatedly before the final draw. Going straight from 512 to 16 in
   * one step drops most of the pixels on the floor and the icon comes out speckled.
   */
  private async encode(base: HTMLCanvasElement, size: number): Promise<Blob> {
    let current = base;

    while (current.width > size * 2) {
      const half = document.createElement('canvas');
      half.width = Math.max(size, Math.round(current.width / 2));
      half.height = half.width;

      const context = half.getContext('2d');
      if (context === null) {
        break;
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(current, 0, 0, half.width, half.height);

      if (current !== base) {
        current.width = 1;
        current.height = 1;
      }
      current = half;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (context === null) {
      throw new Error('no 2d context');
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(current, 0, 0, size, size);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (blob === null) {
      throw new Error('encode failed');
    }
    return blob;
  }

  private releaseOutputUrls(): void {
    for (const icon of this.icons) {
      URL.revokeObjectURL(icon.url);
    }
    this.icons = [];
    if (this.icoUrl !== null) {
      URL.revokeObjectURL(this.icoUrl);
      this.icoUrl = null;
    }
  }

  private releaseUrls(): void {
    this.releaseOutputUrls();
    if (this.zipUrl !== null) {
      URL.revokeObjectURL(this.zipUrl);
      this.zipUrl = null;
    }
    if (this.sourceUrl !== null) {
      URL.revokeObjectURL(this.sourceUrl);
      this.sourceUrl = null;
    }
  }
}
