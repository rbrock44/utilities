import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type SizeMode = 'dimensions' | 'percent';
type Format = 'original' | 'image/png' | 'image/jpeg' | 'image/webp';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DIMENSION = 10000;

@Component({
  selector: 'app-image-resizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-resizer.html',
  styleUrl: './image-resizer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageResizerComponent implements OnDestroy {
  file: File | null = null;
  originalWidth = 0;
  originalHeight = 0;
  originalSize = 0;
  originalType = '';

  mode: SizeMode = 'dimensions';
  targetWidth = 0;
  targetHeight = 0;
  percent = 100;
  lockAspect = true;
  format: Format = 'original';
  quality = 90;

  isDragging = false;
  isProcessing = false;
  errorMessage: string | null = null;

  outputUrl: string | null = null;
  outputSize = 0;

  private image: HTMLImageElement | null = null;
  private sourceUrl: string | null = null;
  private renderTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    this.releaseUrls();
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
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
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.originalSize = 0;
    this.originalType = '';
    this.outputSize = 0;
    this.percent = 100;
    this.format = 'original';
    this.quality = 90;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  onWidthChange(): void {
    if (this.lockAspect && this.originalWidth > 0) {
      this.targetHeight = Math.max(
        1,
        Math.round((Number(this.targetWidth) * this.originalHeight) / this.originalWidth)
      );
    }
    this.scheduleRender();
  }

  onHeightChange(): void {
    if (this.lockAspect && this.originalHeight > 0) {
      this.targetWidth = Math.max(
        1,
        Math.round((Number(this.targetHeight) * this.originalWidth) / this.originalHeight)
      );
    }
    this.scheduleRender();
  }

  onPercentChange(): void {
    const scale = Number(this.percent) / 100;
    this.targetWidth = Math.max(1, Math.round(this.originalWidth * scale));
    this.targetHeight = Math.max(1, Math.round(this.originalHeight * scale));
    this.scheduleRender();
  }

  onModeChange(mode: SizeMode): void {
    this.mode = mode;
    if (mode === 'percent') {
      this.onPercentChange();
    }
    this.cdr.markForCheck();
  }

  resetSize(): void {
    this.targetWidth = this.originalWidth;
    this.targetHeight = this.originalHeight;
    this.percent = 100;
    this.scheduleRender();
  }

  scheduleRender(): void {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    this.renderTimeout = setTimeout(() => this.render(), 150);
  }

  get outputMime(): string {
    return this.format === 'original' ? this.normalizedSourceType : this.format;
  }

  get usesQuality(): boolean {
    return this.outputMime === 'image/jpeg' || this.outputMime === 'image/webp';
  }

  get flattensAlpha(): boolean {
    return this.outputMime === 'image/jpeg' && this.originalType !== 'image/jpeg';
  }

  get sizeDelta(): number {
    if (this.originalSize === 0 || this.outputSize === 0) {
      return 0;
    }
    return ((this.outputSize - this.originalSize) / this.originalSize) * 100;
  }

  get outputExtension(): string {
    const map: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    };
    return map[this.outputMime] ?? 'png';
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

  download(): void {
    if (this.outputUrl === null || this.file === null) {
      return;
    }

    const base = this.file.name.replace(/\.[^.]+$/, '');
    const a = document.createElement('a');
    a.href = this.outputUrl;
    a.download = `${base}-${this.targetWidth}x${this.targetHeight}.${this.outputExtension}`;
    a.click();
  }

  private get normalizedSourceType(): string {
    return ['image/png', 'image/jpeg', 'image/webp'].includes(this.originalType)
      ? this.originalType
      : 'image/png';
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
      )}. The limit is ${this.formatBytes(MAX_FILE_BYTES)}.`;
      this.cdr.markForCheck();
      return;
    }

    this.file = file;
    this.originalSize = file.size;
    this.originalType = file.type;
    this.sourceUrl = URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {
      this.image = image;
      this.originalWidth = image.naturalWidth;
      this.originalHeight = image.naturalHeight;
      this.targetWidth = image.naturalWidth;
      this.targetHeight = image.naturalHeight;
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

    const width = Math.round(Number(this.targetWidth));
    const height = Math.round(Number(this.targetHeight));

    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
      this.errorMessage = 'Width and height must both be at least 1 pixel.';
      this.cdr.markForCheck();
      return;
    }

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      this.errorMessage = `Keep both dimensions under ${MAX_DIMENSION} pixels.`;
      this.cdr.markForCheck();
      return;
    }

    this.isProcessing = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (context === null) {
        throw new Error('no 2d context');
      }

      // JPEG has no alpha channel, so transparent pixels would go black.
      if (this.outputMime === 'image/jpeg') {
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, width, height);
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(this.image, 0, 0, width, height);

      const mime = this.outputMime;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mime, this.usesQuality ? this.quality / 100 : undefined)
      );

      if (blob === null) {
        throw new Error('encode failed');
      }

      if (this.outputUrl !== null) {
        URL.revokeObjectURL(this.outputUrl);
      }

      this.outputUrl = URL.createObjectURL(blob);
      this.outputSize = blob.size;
    } catch {
      this.errorMessage = 'This browser could not encode that format. Try PNG or JPEG.';
    } finally {
      this.isProcessing = false;
      this.cdr.markForCheck();
    }
  }

  private releaseUrls(): void {
    if (this.sourceUrl !== null) {
      URL.revokeObjectURL(this.sourceUrl);
      this.sourceUrl = null;
    }
    if (this.outputUrl !== null) {
      URL.revokeObjectURL(this.outputUrl);
      this.outputUrl = null;
    }
  }
}
