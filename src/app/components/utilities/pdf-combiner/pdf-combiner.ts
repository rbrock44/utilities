import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PDFDocument } from 'pdf-lib';

interface PdfEntry {
  id: number;
  file: File;
  name: string;
  pageCount: number | null;
}

@Component({
  selector: 'app-pdf-combiner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-combiner.html',
  styleUrl: './pdf-combiner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfCombinerComponent {
  pdfs: PdfEntry[] = [];
  isDragging = false;
  isMerging = false;
  errorMessage: string | null = null;
  private nextId = 1;

  constructor(private cdr: ChangeDetectorRef) {}

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
      input.value = '';
    }
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
    const files = event.dataTransfer?.files;
    if (files) {
      this.addFiles(Array.from(files).filter((f) => f.type === 'application/pdf'));
    }
  }

  private addFiles(files: File[]): void {
    this.errorMessage = null;
    const pdfFiles = files.filter((f) => f.type === 'application/pdf');
    pdfFiles.forEach((file) => {
      const entry: PdfEntry = { id: this.nextId++, file, name: file.name, pageCount: null };
      this.pdfs.push(entry);
      this.loadPageCount(entry);
    });
    this.cdr.markForCheck();
  }

  private loadPageCount(entry: PdfEntry): void {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bytes = e.target!.result as ArrayBuffer;
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        entry.pageCount = doc.getPageCount();
      } catch {
        entry.pageCount = null;
      }
      this.cdr.markForCheck();
    };
    reader.readAsArrayBuffer(entry.file);
  }

  removeFile(id: number): void {
    this.pdfs = this.pdfs.filter((p) => p.id !== id);
    this.errorMessage = null;
  }

  moveUp(index: number): void {
    if (index > 0) {
      [this.pdfs[index - 1], this.pdfs[index]] = [this.pdfs[index], this.pdfs[index - 1]];
      this.pdfs = [...this.pdfs];
    }
  }

  moveDown(index: number): void {
    if (index < this.pdfs.length - 1) {
      [this.pdfs[index], this.pdfs[index + 1]] = [this.pdfs[index + 1], this.pdfs[index]];
      this.pdfs = [...this.pdfs];
    }
  }

  get canMerge(): boolean {
    return this.pdfs.length >= 2 && !this.isMerging;
  }

  get totalPages(): number {
    return this.pdfs.reduce((sum, p) => sum + (p.pageCount ?? 0), 0);
  }

  async mergePdfs(): Promise<void> {
    if (!this.canMerge) return;
    this.isMerging = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    try {
      const merged = await PDFDocument.create();

      for (const entry of this.pdfs) {
        const bytes = await entry.file.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }

      const pdfBytes = await merged.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'combined.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.errorMessage = 'Failed to merge PDFs. One or more files may be password-protected or corrupt.';
    } finally {
      this.isMerging = false;
      this.cdr.markForCheck();
    }
  }
}
