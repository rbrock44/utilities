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
  /** Format jsPDF can embed as-is, or null when the bytes must be redrawn first. */
  passthroughFormat: 'JPEG' | 'PNG' | null;
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
      passthroughFormat: null,
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
      entry.passthroughFormat = await this.detectPassthroughFormat(entry.file);
      this.cdr.markForCheck();
    };
    reader.onerror = () => {
      entry.usable = false;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(entry.file);
  }

  private async detectPassthroughFormat(file: File): Promise<'JPEG' | 'PNG' | null> {
    try {
      // The frame header sits before the scan data; 256 KB clears even fat EXIF/ICC blocks.
      const head = new Uint8Array(await file.slice(0, 262144).arrayBuffer());

      if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
        return 'PNG';
      }
      if (head[0] !== 0xff || head[1] !== 0xd8) return null;

      let offset = 2;
      while (offset + 9 < head.length) {
        if (head[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = head[offset + 1];
        // Padding, restart markers and SOI carry no payload.
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          offset += 2;
          continue;
        }
        // Scan data or end of image: no frame header found.
        if (marker === 0xda || marker === 0xd9) return null;

        // SOF markers are C0-CF except C4 (Huffman tables), C8 (reserved) and CC (arithmetic tables).
        const isFrameHeader =
          marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isFrameHeader) {
          const progressive = marker === 0xc2 || marker === 0xc6 || marker === 0xca || marker === 0xce;
          const arithmetic = marker >= 0xc9;
          const components = head[offset + 9];
          const plainColour = components === 1 || components === 3;
          return !progressive && !arithmetic && plainColour ? 'JPEG' : null;
        }
        offset += 2 + ((head[offset + 2] << 8) | head[offset + 3]);
      }
    } catch {
      // Fall through — redrawing is always the safe option.
    }
    return null;
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

        // Normal photos keep their original bytes; only formats a PDF viewer cannot
        // decode are redrawn through a canvas.
        let data = entry.dataUrl!;
        let format: 'JPEG' | 'PNG' = entry.passthroughFormat ?? 'JPEG';
        if (entry.passthroughFormat === null) {
          const redrawn = this.renderToJpeg(img, rect.w, rect.h);
          if (redrawn) {
            data = redrawn;
            format = 'JPEG';
          }
        }

        pdf.addImage(data, format, rect.x, rect.y, rect.w, rect.h);
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

  /** Where the image sits on the page. `fill` overflows the page, which the viewer clips. */
  private computeRect(
    img: HTMLImageElement,
    pageWidth: number,
    pageHeight: number
  ): { x: number; y: number; w: number; h: number } {
    if (this.fitMode === 'stretch') {
      return { x: 0, y: 0, w: pageWidth, h: pageHeight };
    }

    const pageRatio = pageWidth / pageHeight;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    // A file that decoded to nothing would poison the page box with NaN.
    if (!Number.isFinite(imgRatio) || imgRatio <= 0) {
      return { x: 0, y: 0, w: pageWidth, h: pageHeight };
    }

    // `fit` matches the limiting edge so the whole image shows; `fill` matches the other
    // edge so the image covers the page, overflowing the side the viewer clips.
    const wider = imgRatio > pageRatio;
    const matchWidth = this.fitMode === 'fill' ? !wider : wider;

    const w = matchWidth ? pageWidth : pageHeight * imgRatio;
    const h = matchWidth ? pageWidth / imgRatio : pageHeight;
    return { x: (pageWidth - w) / 2, y: (pageHeight - h) / 2, w, h };
  }

  /**
   * Redraws an image jsPDF cannot embed directly as a baseline sRGB JPEG, capped at
   * `maxDpi` for its printed size. Returns null if the canvas came back blank, so the
   * caller can fall back to the original bytes rather than write a black page.
   */
  private renderToJpeg(
    img: HTMLImageElement,
    destWidthPt: number,
    destHeightPt: number
  ): string | null {
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    if (!sw || !sh) return null;

    const maxWidth = Math.max(1, Math.round((destWidthPt / 72) * this.maxDpi));
    const maxHeight = Math.max(1, Math.round((destHeightPt / 72) * this.maxDpi));
    const scale = Math.min(1, maxWidth / sw, maxHeight / sh);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // JPEG has no alpha, so anything transparent would otherwise flatten onto black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (!this.hasContent(ctx, canvas.width, canvas.height)) return null;

    const data = canvas.toDataURL('image/jpeg', this.jpegQuality);
    // Drop the backing store rather than wait for GC during a long batch.
    canvas.width = 1;
    canvas.height = 1;
    return data;
  }

  /**
   * A canvas the browser failed to back (memory pressure, size limits) reads back fully
   * transparent and would encode to solid black, so check a small sample before trusting it.
   */
  private hasContent(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
    try {
      const size = Math.min(8, width, height);
      const x = Math.max(0, Math.floor((width - size) / 2));
      const y = Math.max(0, Math.floor((height - size) / 2));
      const { data } = ctx.getImageData(x, y, size, size);
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) return true;
      }
      return false;
    } catch {
      // getImageData can throw on a tainted canvas; assume the draw worked.
      return true;
    }
  }
}
