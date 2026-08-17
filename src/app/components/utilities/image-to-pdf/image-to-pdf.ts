import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import jsPDF from 'jspdf';

interface ImageEntry {
  id: number;
  file: File;
  dataUrl: string | null;
  name: string;
  /** null while still decoding, false when the browser cannot read the file at all. */
  usable: boolean | null;
  width: number;
  height: number;
}

type PageSize = 'a4' | 'letter' | 'legal';
type Orientation = 'portrait' | 'landscape';
type FitMode = 'fit' | 'fill' | 'stretch';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-image-to-pdf',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
  ],
  templateUrl: './image-to-pdf.html',
  styleUrl: './image-to-pdf.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageToPdfComponent {
  images: ImageEntry[] = [];
  pageSize: PageSize = 'a4';
  orientation: Orientation = 'portrait';
  fitMode: FitMode = 'fit';
  fileName = 'images';
  isDragging = false;
  isGenerating = false;
  generatedCount = 0;
  sortDirection: SortDirection | null = null;
  private nextId = 1;

  private readonly maxDpi = 300;
  private readonly jpegQuality = 0.92;
  /** Numeric collation so IMG_2 sorts before IMG_10. */
  private readonly collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  });

  readonly pageSizes: { value: PageSize; label: string }[] = [
    { value: 'a4', label: 'A4' },
    { value: 'letter', label: 'Letter' },
    { value: 'legal', label: 'Legal' },
  ];

  readonly orientations: { value: Orientation; label: string }[] = [
    { value: 'portrait', label: 'Portrait' },
    { value: 'landscape', label: 'Landscape' },
  ];

  readonly fitModes: { value: FitMode; label: string }[] = [
    { value: 'fit', label: 'Fit (keep aspect ratio)' },
    { value: 'fill', label: 'Fill (crop to fill page)' },
    { value: 'stretch', label: 'Stretch (ignore aspect ratio)' },
  ];

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
      this.addFiles(Array.from(files));
    }
  }

  private addFiles(files: File[]): void {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const entries: ImageEntry[] = imageFiles.map((file) => ({
      id: this.nextId++,
      file,
      dataUrl: null,
      name: file.name,
      usable: null,
      width: 0,
      height: 0,
    }));
    this.images = [...this.images, ...entries];
    this.sortDirection = null;
    this.cdr.markForCheck();

    entries.forEach((entry) => this.loadEntry(entry));
  }

  private loadEntry(entry: ImageEntry): void {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target!.result as string;
      const img = await this.decode(dataUrl);
      entry.dataUrl = dataUrl;
      entry.usable = img !== null;
      entry.width = img?.naturalWidth ?? 0;
      entry.height = img?.naturalHeight ?? 0;
      this.cdr.markForCheck();
    };
    reader.onerror = () => {
      entry.usable = false;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(entry.file);
  }

  private decode(dataUrl: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  removeImage(id: number): void {
    this.images = this.images.filter((img) => img.id !== id);
  }

  onListDrop(event: CdkDragDrop<ImageEntry[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const reordered = [...this.images];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.images = reordered;
    this.sortDirection = null;
  }

  moveUp(index: number): void {
    if (index > 0) {
      const reordered = [...this.images];
      moveItemInArray(reordered, index, index - 1);
      this.images = reordered;
      this.sortDirection = null;
    }
  }

  moveDown(index: number): void {
    if (index < this.images.length - 1) {
      const reordered = [...this.images];
      moveItemInArray(reordered, index, index + 1);
      this.images = reordered;
      this.sortDirection = null;
    }
  }

  /** First click sorts A→Z, clicking again flips to Z→A. */
  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    const direction = this.sortDirection === 'asc' ? 1 : -1;
    this.images = [...this.images].sort(
      (a, b) => direction * this.collator.compare(a.name, b.name)
    );
  }

  get sortLabel(): string {
    if (this.sortDirection === 'asc') return 'Sorted A→Z';
    if (this.sortDirection === 'desc') return 'Sorted Z→A';
    return 'Sort A→Z';
  }

  get brokenCount(): number {
    return this.images.filter((img) => img.usable === false).length;
  }

  get usableCount(): number {
    return this.images.filter((img) => img.usable === true).length;
  }

  get isLoading(): boolean {
    return this.images.some((img) => img.usable === null);
  }

  get canGenerate(): boolean {
    return this.usableCount > 0 && !this.isGenerating && !this.isLoading;
  }

  clearAll(): void {
    this.images = [];
    this.sortDirection = null;
  }

  async generatePdf(): Promise<void> {
    if (!this.canGenerate) return;
    this.isGenerating = true;
    this.generatedCount = 0;
    this.cdr.markForCheck();

    try {
      const pdf = new jsPDF({ orientation: this.orientation, format: this.pageSize, unit: 'pt' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pages = this.images.filter((img) => img.usable === true && img.dataUrl !== null);

      let written = 0;
      for (const entry of pages) {
        const img = await this.decode(entry.dataUrl!);
        if (!img) continue;

        if (written > 0) pdf.addPage();
        const rect = this.computeRect(img, pageWidth, pageHeight);
        pdf.addImage(this.renderToJpeg(img, rect.w, rect.h), 'JPEG', rect.x, rect.y, rect.w, rect.h);
        written++;

        this.generatedCount = written;
        this.cdr.markForCheck();
        // Let the browser paint the progress label between pages.
        await new Promise((resolve) => setTimeout(resolve));
      }

      if (written === 0) return;

      const name = (this.fileName.trim() || 'images').replace(/\.pdf$/i, '');
      pdf.save(`${name}.pdf`);
    } finally {
      this.isGenerating = false;
      this.cdr.markForCheck();
    }
  }

  /** Where the image sits on the page. `fill` covers the page because we crop on the canvas. */
  private computeRect(
    img: HTMLImageElement,
    pageWidth: number,
    pageHeight: number
  ): { x: number; y: number; w: number; h: number } {
    if (this.fitMode === 'stretch' || this.fitMode === 'fill') {
      return { x: 0, y: 0, w: pageWidth, h: pageHeight };
    }

    const pageRatio = pageWidth / pageHeight;
    const imgRatio = img.naturalWidth / img.naturalHeight;

    let w: number;
    let h: number;
    if (imgRatio > pageRatio) {
      w = pageWidth;
      h = pageWidth / imgRatio;
    } else {
      h = pageHeight;
      w = pageHeight * imgRatio;
    }
    return { x: (pageWidth - w) / 2, y: (pageHeight - h) / 2, w, h };
  }

  /** Redraws the image as a baseline sRGB JPEG, capped at `maxDpi` for its printed size. */
  private renderToJpeg(img: HTMLImageElement, destWidthPt: number, destHeightPt: number): string {
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;

    if (this.fitMode === 'fill') {
      const destRatio = destWidthPt / destHeightPt;
      if (sw / sh > destRatio) {
        sw = sh * destRatio;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = sw / destRatio;
        sy = (img.naturalHeight - sh) / 2;
      }
    }

    const maxWidth = Math.max(1, Math.round((destWidthPt / 72) * this.maxDpi));
    const maxHeight = Math.max(1, Math.round((destHeightPt / 72) * this.maxDpi));
    const scale = Math.min(1, maxWidth / sw, maxHeight / sh);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));

    const ctx = canvas.getContext('2d')!;
    // JPEG has no alpha, so transparent PNGs would otherwise flatten onto black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', this.jpegQuality);
  }
}
