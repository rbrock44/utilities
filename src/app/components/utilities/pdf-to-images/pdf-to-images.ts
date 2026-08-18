import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { Bytes, buildZip } from '../../../services/zip';

interface RenderedPage {
  page: number;
  width: number;
  height: number;
  fileName: string;
  bytes: Bytes;
  url: string;
}

type Format = 'image/png' | 'image/jpeg';

const MAX_FILE_BYTES = 100 * 1024 * 1024;
/** A page over this many pixels either fails to allocate or crawls on a phone. */
const MAX_PIXELS = 40_000_000;

@Component({
  selector: 'app-pdf-to-images',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-to-images.html',
  styleUrl: './pdf-to-images.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfToImagesComponent implements OnDestroy {
  file: File | null = null;
  pageCount = 0;
  isDragging = false;
  isLoading = false;
  isRendering = false;
  renderedCount = 0;
  errorMessage: string | null = null;

  format: Format = 'image/png';
  quality = 92;
  dpi = 150;
  pageSpec = '';

  pages: RenderedPage[] = [];

  readonly dpiOptions = [
    { value: 72, label: '72 dpi — screen' },
    { value: 150, label: '150 dpi — good' },
    { value: 300, label: '300 dpi — print' },
  ];

  private document: PDFDocumentProxy | null = null;
  private loadingTask: PDFDocumentLoadingTask | null = null;
  private zipUrl: string | null = null;
  private workerConfigured = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    this.releaseUrls();
    this.closeDocument();
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void this.loadFile(file);
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
      candidate.type === 'application/pdf' || candidate.name.toLowerCase().endsWith('.pdf')
    );
    if (file) {
      void this.loadFile(file);
    } else {
      this.errorMessage = 'That is not a PDF file.';
      this.cdr.markForCheck();
    }
  }

  clear(): void {
    this.releaseUrls();
    this.closeDocument();
    this.file = null;
    this.pageCount = 0;
    this.pages = [];
    this.pageSpec = '';
    this.renderedCount = 0;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  /**
   * Reads a page list like `1-3, 7, 10-` into page numbers, in the order written and
   * without repeats. An empty box means every page.
   */
  parsePages(spec: string, pageCount: number): number[] | null {
    const trimmed = spec.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'all') {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    const seen = new Set<number>();
    for (const part of trimmed.split(',')) {
      const piece = part.trim();
      if (piece === '') {
        continue;
      }

      const match = /^(\d+)?\s*(-)?\s*(\d+)?$/.exec(piece);
      if (match === null || (match[1] === undefined && match[3] === undefined)) {
        return null;
      }

      const open = match[2] !== undefined;
      const start = match[1] !== undefined ? Number(match[1]) : 1;
      const end = open ? (match[3] !== undefined ? Number(match[3]) : pageCount) : start;

      if (start < 1 || end < start || end > pageCount) {
        return null;
      }
      for (let page = start; page <= end; page++) {
        seen.add(page);
      }
    }

    return seen.size === 0 ? null : [...seen];
  }

  get selectedPages(): number[] | null {
    return this.pageCount === 0 ? [] : this.parsePages(this.pageSpec, this.pageCount);
  }

  get selectionLabel(): string {
    const pages = this.selectedPages;
    if (pages === null) {
      return `Enter page numbers between 1 and ${this.pageCount}`;
    }
    return pages.length === this.pageCount
      ? `All ${this.pageCount} page${this.pageCount === 1 ? '' : 's'}`
      : `${pages.length} of ${this.pageCount} pages`;
  }

  get canRender(): boolean {
    const pages = this.selectedPages;
    return (
      this.document !== null && !this.isRendering && pages !== null && pages.length > 0
    );
  }

  get usesQuality(): boolean {
    return this.format === 'image/jpeg';
  }

  get totalBytes(): number {
    return this.pages.reduce((sum, page) => sum + page.bytes.length, 0);
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

  fileNameFor(page: number, pageCount: number): string {
    const base = (this.file?.name ?? 'document').replace(/\.pdf$/i, '') || 'document';
    const width = String(pageCount).length;
    const extension = this.format === 'image/png' ? 'png' : 'jpg';
    return `${base}-page-${String(page).padStart(width, '0')}.${extension}`;
  }

  downloadPage(page: RenderedPage): void {
    this.triggerDownload(page.url, page.fileName);
  }

  downloadZip(): void {
    if (this.pages.length === 0) {
      return;
    }

    const zip = buildZip(
      this.pages.map((page) => ({ name: page.fileName, bytes: page.bytes }))
    );

    // Held until the next zip or teardown: revoking straight after the click races the
    // download in Safari.
    if (this.zipUrl !== null) {
      URL.revokeObjectURL(this.zipUrl);
    }
    this.zipUrl = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));

    const base = (this.file?.name ?? 'document').replace(/\.pdf$/i, '') || 'document';
    this.triggerDownload(this.zipUrl, `${base}-pages.zip`);
  }

  async render(): Promise<void> {
    const pages = this.selectedPages;
    if (this.document === null || pages === null || pages.length === 0 || this.isRendering) {
      return;
    }

    this.isRendering = true;
    this.renderedCount = 0;
    this.errorMessage = null;
    this.releaseUrls();
    this.pages = [];
    this.cdr.markForCheck();

    const scale = Number(this.dpi) / 72;
    const rendered: RenderedPage[] = [];

    try {
      for (const number of pages) {
        const page = await this.document.getPage(number);
        let viewport = page.getViewport({ scale });

        // Oversized pages at 300 dpi can blow past what a canvas will allocate, so back
        // the scale off rather than hand the user a blank image.
        const pixels = viewport.width * viewport.height;
        if (pixels > MAX_PIXELS) {
          viewport = page.getViewport({ scale: scale * Math.sqrt(MAX_PIXELS / pixels) });
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));

        await page.render({ canvas, viewport }).promise;
        page.cleanup();

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(
            resolve,
            this.format,
            this.usesQuality ? this.quality / 100 : undefined
          )
        );
        if (blob === null) {
          throw new Error('encode failed');
        }

        const bytes = new Uint8Array(await blob.arrayBuffer());
        rendered.push({
          page: number,
          width: canvas.width,
          height: canvas.height,
          fileName: this.fileNameFor(number, this.pageCount),
          bytes,
          url: URL.createObjectURL(blob),
        });

        canvas.width = 1;
        canvas.height = 1;

        this.renderedCount = rendered.length;
        this.pages = [...rendered];
        this.cdr.markForCheck();
        // Let the browser paint the progress count between pages.
        await new Promise((resolve) => setTimeout(resolve));
      }
    } catch {
      this.errorMessage = 'Something in that PDF could not be rendered.';
    } finally {
      this.isRendering = false;
      this.cdr.markForCheck();
    }
  }

  private async loadFile(file: File): Promise<void> {
    this.clear();

    if (file.size > MAX_FILE_BYTES) {
      this.errorMessage = `That PDF is ${this.formatBytes(file.size)}. The limit is 100 MB.`;
      this.cdr.markForCheck();
      return;
    }

    this.file = file;
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      const pdfjs = await this.loadPdfjs();
      const bytes = new Uint8Array(await file.arrayBuffer());
      this.loadingTask = pdfjs.getDocument({ data: bytes });
      this.document = await this.loadingTask.promise;
      this.pageCount = this.document.numPages;
    } catch {
      this.file = null;
      this.errorMessage = 'That PDF could not be opened. It may be encrypted or damaged.';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * pdf.js is a few hundred kilobytes, so it only arrives once a file does. Its worker is
   * copied to the site root by the build rather than bundled, because it has to load as a
   * separate script.
   */
  private async loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
    const pdfjs = await import('pdfjs-dist');
    if (!this.workerConfigured) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdf.worker.min.mjs',
        document.baseURI
      ).href;
      this.workerConfigured = true;
    }
    return pdfjs;
  }

  private closeDocument(): void {
    // Destroying the loading task tears down the worker with the document.
    void this.loadingTask?.destroy();
    this.loadingTask = null;
    this.document = null;
  }

  private triggerDownload(url: string, fileName: string): void {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
  }

  private releaseUrls(): void {
    for (const page of this.pages) {
      URL.revokeObjectURL(page.url);
    }
    this.pages = [];
    if (this.zipUrl !== null) {
      URL.revokeObjectURL(this.zipUrl);
      this.zipUrl = null;
    }
  }
}
