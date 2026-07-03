import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';

interface ImageEntry {
  id: number;
  file: File;
  dataUrl: string;
  name: string;
}

type PageSize = 'a4' | 'letter' | 'legal';
type Orientation = 'portrait' | 'landscape';
type FitMode = 'fit' | 'fill' | 'stretch';

@Component({
  selector: 'app-image-to-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-to-pdf.html',
  styleUrl: './image-to-pdf.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageToPdfComponent {
  images: ImageEntry[] = [];
  pageSize: PageSize = 'a4';
  orientation: Orientation = 'portrait';
  fitMode: FitMode = 'fit';
  isDragging = false;
  isGenerating = false;
  private nextId = 1;

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
      this.addFiles(Array.from(files).filter((f) => f.type.startsWith('image/')));
    }
  }

  private addFiles(files: File[]): void {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.images.push({
          id: this.nextId++,
          file,
          dataUrl: e.target!.result as string,
          name: file.name,
        });
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(id: number): void {
    this.images = this.images.filter((img) => img.id !== id);
  }

  moveUp(index: number): void {
    if (index > 0) {
      [this.images[index - 1], this.images[index]] = [this.images[index], this.images[index - 1]];
      this.images = [...this.images];
    }
  }

  moveDown(index: number): void {
    if (index < this.images.length - 1) {
      [this.images[index], this.images[index + 1]] = [this.images[index + 1], this.images[index]];
      this.images = [...this.images];
    }
  }

  get canGenerate(): boolean {
    return this.images.length > 0 && !this.isGenerating;
  }

  async generatePdf(): Promise<void> {
    if (!this.canGenerate) return;
    this.isGenerating = true;
    this.cdr.markForCheck();

    try {
      const pdf = new jsPDF({ orientation: this.orientation, format: this.pageSize, unit: 'pt' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < this.images.length; i++) {
        if (i > 0) pdf.addPage();
        const entry = this.images[i];
        const { x, y, w, h } = await this.computeImageRect(
          entry.dataUrl,
          pageWidth,
          pageHeight
        );
        pdf.addImage(entry.dataUrl, 'JPEG', x, y, w, h);
      }

      pdf.save('images.pdf');
    } finally {
      this.isGenerating = false;
      this.cdr.markForCheck();
    }
  }

  private computeImageRect(
    dataUrl: string,
    pageWidth: number,
    pageHeight: number
  ): Promise<{ x: number; y: number; w: number; h: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;

        if (this.fitMode === 'stretch') {
          resolve({ x: 0, y: 0, w: pageWidth, h: pageHeight });
          return;
        }

        const pageRatio = pageWidth / pageHeight;
        const imgRatio = imgW / imgH;

        let w: number;
        let h: number;

        if (this.fitMode === 'fit') {
          if (imgRatio > pageRatio) {
            w = pageWidth;
            h = pageWidth / imgRatio;
          } else {
            h = pageHeight;
            w = pageHeight * imgRatio;
          }
          resolve({ x: (pageWidth - w) / 2, y: (pageHeight - h) / 2, w, h });
        } else {
          // fill — scale so the image covers the full page, cropped via jsPDF clip (not supported)
          // We simulate fill by scaling to cover and centering
          if (imgRatio > pageRatio) {
            h = pageHeight;
            w = pageHeight * imgRatio;
          } else {
            w = pageWidth;
            h = pageWidth / imgRatio;
          }
          resolve({ x: (pageWidth - w) / 2, y: (pageHeight - h) / 2, w, h });
        }
      };
      img.src = dataUrl;
    });
  }
}
