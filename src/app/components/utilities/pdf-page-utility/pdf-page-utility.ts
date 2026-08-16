import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PDFDocument, degrees } from 'pdf-lib';

type PageMode = 'extract' | 'remove';

@Component({
  selector: 'app-pdf-page-utility',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-page-utility.html',
  styleUrl: './pdf-page-utility.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfPageUtilityComponent {
  file: File | null = null;
  sourceName = '';
  pageCount = 0;
  isDragging = false;
  isLoading = false;
  isProcessing = false;

  mode: PageMode = 'extract';
  pageRange = '';
  rotation = 0;
  fileName = 'extracted';

  resultPages: number[] = [];
  rangeError: string | null = null;
  errorMessage: string | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

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
    const file = Array.from(event.dataTransfer?.files ?? []).find(
      (f) => f.type === 'application/pdf'
    );
    if (file) {
      this.loadFile(file);
    } else {
      this.errorMessage = 'Only PDF files are accepted.';
      this.cdr.markForCheck();
    }
  }

  clear(): void {
    this.file = null;
    this.sourceName = '';
    this.pageCount = 0;
    this.pageRange = '';
    this.rotation = 0;
    this.mode = 'extract';
    this.fileName = 'extracted';
    this.resultPages = [];
    this.rangeError = null;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  onOptionsChange(): void {
    this.recompute();
    this.cdr.markForCheck();
  }

  get canDownload(): boolean {
    return (
      this.file !== null &&
      this.rangeError === null &&
      this.resultPages.length > 0 &&
      !this.isProcessing
    );
  }

  get resultSummary(): string {
    const pages = this.resultPages;
    if (pages.length === 0) {
      return '';
    }

    const parts: string[] = [];
    let start = pages[0];
    let previous = pages[0];

    for (let i = 1; i <= pages.length; i++) {
      const current = pages[i];
      if (current !== previous + 1) {
        parts.push(start === previous ? `${start}` : `${start}-${previous}`);
        start = current;
      }
      previous = current;
    }

    return parts.join(', ');
  }

  async downloadPdf(): Promise<void> {
    if (!this.canDownload || !this.file) {
      return;
    }

    this.isProcessing = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      const bytes = await this.file.arrayBuffer();
      const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const output = await PDFDocument.create();

      const pages = await output.copyPages(
        source,
        this.resultPages.map((page) => page - 1)
      );

      pages.forEach((page) => {
        if (this.rotation !== 0) {
          const current = page.getRotation().angle;
          page.setRotation(degrees(((current + this.rotation) % 360 + 360) % 360));
        }
        output.addPage(page);
      });

      const pdfBytes = await output.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const name = (this.fileName.trim() || 'extracted').replace(/\.pdf$/i, '');
      a.download = `${name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.errorMessage = 'Failed to build the PDF. The file may be password protected or corrupt.';
    } finally {
      this.isProcessing = false;
      this.cdr.markForCheck();
    }
  }

  private async loadFile(file: File): Promise<void> {
    this.clear();
    this.file = file;
    this.sourceName = file.name;
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      this.pageCount = doc.getPageCount();
      this.pageRange = this.pageCount > 1 ? `1-${this.pageCount}` : '1';
      this.fileName = `${file.name.replace(/\.pdf$/i, '')}-pages`;
      this.recompute();
    } catch {
      this.file = null;
      this.sourceName = '';
      this.pageCount = 0;
      this.errorMessage = 'Could not read that PDF. It may be password protected or corrupt.';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private recompute(): void {
    this.rangeError = null;
    this.resultPages = [];

    if (this.pageCount === 0) {
      return;
    }

    const text = this.pageRange.trim();
    if (text === '') {
      return;
    }

    const selected: number[] = [];

    for (const rawToken of text.split(',')) {
      const token = rawToken.trim();
      if (token === '') {
        continue;
      }

      const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token);
      if (!match) {
        this.rangeError = `"${token}" is not a valid page or range.`;
        return;
      }

      const start = Number(match[1]);
      const end = match[2] === undefined ? start : Number(match[2]);

      for (const page of [start, end]) {
        if (page < 1 || page > this.pageCount) {
          this.rangeError = `Page ${page} is out of range, this PDF has ${this.pageCount} page${
            this.pageCount !== 1 ? 's' : ''
          }.`;
          return;
        }
      }

      if (start <= end) {
        for (let page = start; page <= end; page++) {
          selected.push(page);
        }
      } else {
        for (let page = start; page >= end; page--) {
          selected.push(page);
        }
      }
    }

    if (selected.length === 0) {
      return;
    }

    if (this.mode === 'extract') {
      this.resultPages = selected;
      return;
    }

    const removed = new Set(selected);
    this.resultPages = Array.from({ length: this.pageCount }, (_, i) => i + 1).filter(
      (page) => !removed.has(page)
    );

    if (this.resultPages.length === 0) {
      this.rangeError = 'That would remove every page.';
    }
  }
}
