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

/** One marker segment of a JPEG: `start` points at its 0xFF byte, `end` past its payload. */
interface JpegSegment {
  marker: number;
  start: number;
  end: number;
}

interface JpegLayout {
  segments: JpegSegment[];
  /** Index of the frame header in `segments`, or -1 when the file has none. */
  sofIndex: number;
  /** First byte of the entropy-coded data, just past the scan header. */
  scanStart: number;
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

        const embed = await this.prepareEmbed(entry, img, rect);
        pdf.addImage(embed.data, embed.format, rect.x, rect.y, rect.w, rect.h);
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

  /**
   * The bytes that go on the page: the original file when it can be embedded untouched,
   * a canvas re-render otherwise.
   */
  private async prepareEmbed(
    entry: ImageEntry,
    img: HTMLImageElement,
    rect: { w: number; h: number }
  ): Promise<{ data: string | Uint8Array; format: 'JPEG' | 'PNG' }> {
    const passthrough = await this.buildPassthrough(entry.file, img);
    if (passthrough) return passthrough;

    const redrawn = this.renderToJpeg(img, rect.w, rect.h);
    if (redrawn) return { data: redrawn, format: 'JPEG' };
    return { data: entry.dataUrl!, format: 'JPEG' };
  }

  /**
   * Original bytes jsPDF can embed as-is, or null when the image has to be redrawn.
   *
   * jsPDF sizes the embedded JPEG by reading the frame header itself, and its scan stops
   * at the first marker in the C0-C7 range — a range that also covers DHT (C4). Recent
   * phone photos put a Huffman table ahead of the frame header, so jsPDF reads the table
   * as a 1281x1 greyscale frame and the page renders as unreadable streaks. Moving those
   * tables behind the frame header is a lossless rewrite that leaves jsPDF reading the
   * real dimensions; anything still misread falls back to the canvas.
   */
  private async buildPassthrough(
    file: File,
    img: HTMLImageElement
  ): Promise<{ data: Uint8Array; format: 'JPEG' | 'PNG' } | null> {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());

      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
        return { data: bytes, format: 'PNG' };
      }
      if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

      const layout = this.readJpegLayout(bytes);
      if (!layout || layout.sofIndex < 0) return null;

      const sof = layout.segments[layout.sofIndex];
      // Only huffman-coded baseline and extended sequential frames: a PDF cannot carry
      // progressive or arithmetic scans, and CMYK needs an Adobe transform jsPDF omits.
      if (sof.marker !== 0xc0 && sof.marker !== 0xc1) return null;
      if (bytes[sof.start + 4] !== 8) return null;
      const components = bytes[sof.start + 9];
      if (components !== 1 && components !== 3) return null;

      const height = (bytes[sof.start + 5] << 8) | bytes[sof.start + 6];
      const width = (bytes[sof.start + 7] << 8) | bytes[sof.start + 8];
      // Dimensions that disagree with the decoded image mean the browser transformed it on
      // the way in (EXIF orientation), so the raw bytes would land on the page rotated.
      if (width !== img.naturalWidth || height !== img.naturalHeight) return null;

      if (this.jsPdfReadsFrameAt(bytes, sof.start)) return { data: bytes, format: 'JPEG' };

      const rebuilt = this.reorderJpegForJsPdf(bytes, layout);
      if (this.jsPdfReadsFrameAt(rebuilt.bytes, rebuilt.sofStart)) {
        return { data: rebuilt.bytes, format: 'JPEG' };
      }
    } catch {
      // Fall through — redrawing is always the safe option.
    }
    return null;
  }

  /** Walks the marker segments up to and including the scan header. */
  private readJpegLayout(bytes: Uint8Array): JpegLayout | null {
    const segments: JpegSegment[] = [];
    let sofIndex = -1;
    let offset = 2;

    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      // Padding, restart markers and a stray SOI carry no payload.
      const marker = bytes[offset + 1];
      if (marker === 0xff) {
        offset++;
        continue;
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      if (marker === 0xd9) return null;

      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      const end = offset + 2 + length;
      if (length < 2 || end > bytes.length) return null;
      segments.push({ marker, start: offset, end });

      // SOF markers are C0-CF except C4 (Huffman tables), C8 (reserved) and CC (arithmetic
      // tables).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        if (sofIndex < 0) sofIndex = segments.length - 1;
      }
      if (marker === 0xda) return { segments, sofIndex, scanStart: end };
      offset = end;
    }
    return null;
  }

  /** Mirrors jsPDF's own frame-header scan, so we only hand it bytes it reads correctly. */
  private jsPdfReadsFrameAt(bytes: Uint8Array, sofStart: number): boolean {
    let blockLength = (bytes[4] << 8) | bytes[5];
    for (let i = 4; i < bytes.length; i += 2) {
      i += blockLength;
      if (i + 3 >= bytes.length) return false;
      if (bytes[i + 1] >= 0xc0 && bytes[i + 1] <= 0xc7) return i === sofStart;
      blockLength = (bytes[i + 2] << 8) | bytes[i + 3];
    }
    return false;
  }

  /**
   * Rewrites the file with every table jsPDF could mistake for a frame header moved behind
   * the real one — the segment order libjpeg itself emits, so no decoder cares.
   */
  private reorderJpegForJsPdf(
    bytes: Uint8Array,
    layout: JpegLayout
  ): { bytes: Uint8Array; sofStart: number } {
    const { segments, sofIndex, scanStart } = layout;
    const confusable = (s: JpegSegment) => s.marker >= 0xc0 && s.marker <= 0xc7;
    const sof = segments[sofIndex];
    const before = segments.slice(0, sofIndex);
    const ordered = [
      ...before.filter((s) => !confusable(s)),
      sof,
      ...before.filter(confusable),
      ...segments.slice(sofIndex + 1),
    ];

    // Entropy data escapes its own 0xFF bytes, so the first EOI past the scan header ends
    // the image; whatever follows (a Pixel gain map, say) is weight the PDF does not need.
    let tailEnd = bytes.length;
    for (let i = scanStart; i + 1 < bytes.length; i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) {
        tailEnd = i + 2;
        break;
      }
    }

    const size = ordered.reduce((n, s) => n + (s.end - s.start), 2 + tailEnd - scanStart);
    const out = new Uint8Array(size);
    out[0] = 0xff;
    out[1] = 0xd8;

    let at = 2;
    let sofStart = 2;
    for (const segment of ordered) {
      if (segment === sof) sofStart = at;
      out.set(bytes.subarray(segment.start, segment.end), at);
      at += segment.end - segment.start;
    }
    out.set(bytes.subarray(scanStart, tailEnd), at);
    return { bytes: out, sofStart };
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
