import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageToPdfComponent } from './image-to-pdf';

type ImageEntry = ImageToPdfComponent['images'][number];

describe('ImageToPdfComponent', () => {
  let component: ImageToPdfComponent;
  let fixture: ComponentFixture<ImageToPdfComponent>;
  let nextId: number;

  const entry = (
    name: string,
    usable: boolean | null = true,
    size: { width: number; height: number } = { width: 800, height: 600 }
  ): ImageEntry => ({
    id: nextId++,
    file: new File([], name, { type: 'image/png' }),
    dataUrl: usable === null ? null : `data:image/png;base64,${name}`,
    name,
    usable,
    width: size.width,
    height: size.height,
  });

  /** A stand-in for a decoded image — the geometry only reads the natural size. */
  const image = (width: number, height: number) =>
    ({ naturalWidth: width, naturalHeight: height }) as HTMLImageElement;

  /** `[0xFF, marker, lengthHi, lengthLo, ...payload]` — the shape of every JPEG segment. */
  const segment = (marker: number, payload: number[]): number[] => {
    const length = payload.length + 2;
    return [0xff, marker, (length >> 8) & 0xff, length & 0xff, ...payload];
  };

  const sof0 = (width: number, height: number, components = 3, precision = 8): number[] => {
    const payload = [
      precision,
      (height >> 8) & 0xff,
      height & 0xff,
      (width >> 8) & 0xff,
      width & 0xff,
      components,
    ];
    for (let i = 0; i < components; i++) {
      payload.push(i + 1, 0x11, 0);
    }
    return segment(0xc0, payload);
  };

  const app0 = () => segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00]);
  const dht = () => segment(0xc4, [0x00, 0x01, 0x02, 0x03]);
  const sos = () => segment(0xda, [0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]);

  const jpeg = (...parts: number[][]) => new Uint8Array([0xff, 0xd8, ...parts.flat()]);

  const readLayout = (bytes: Uint8Array) => component['readJpegLayout'](bytes);

  beforeEach(async () => {
    nextId = 1;

    await TestBed.configureTestingModule({
      imports: [ImageToPdfComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageToPdfComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('page geometry', () => {
    it('should fill the whole page when stretching', () => {
      component.fitMode = 'stretch';

      expect(component['computeRect'](image(800, 600), 595, 842)).toEqual({
        x: 0,
        y: 0,
        w: 595,
        h: 842,
      });
    });

    it('should match the width of a landscape image on a portrait page', () => {
      component.fitMode = 'fit';

      const rect = component['computeRect'](image(800, 400), 600, 800);

      // Wider than the page, so the width is the limiting edge and the rest is letterboxed.
      expect(rect.w).toBeCloseTo(600, 6);
      expect(rect.h).toBeCloseTo(300, 6);
      expect(rect.x).toBeCloseTo(0, 6);
      expect(rect.y).toBeCloseTo(250, 6);
    });

    it('should match the height of a portrait image on a portrait page', () => {
      component.fitMode = 'fit';

      const rect = component['computeRect'](image(400, 800), 600, 800);

      expect(rect.w).toBeCloseTo(400, 6);
      expect(rect.h).toBeCloseTo(800, 6);
      expect(rect.x).toBeCloseTo(100, 6);
      expect(rect.y).toBeCloseTo(0, 6);
    });

    it('should keep a fitted image inside the page', () => {
      component.fitMode = 'fit';

      const rect = component['computeRect'](image(1234, 987), 595, 842);

      expect(rect.w).toBeLessThanOrEqual(595 + 1e-9);
      expect(rect.h).toBeLessThanOrEqual(842 + 1e-9);
    });

    it('should cover the page when filling, overflowing one edge', () => {
      component.fitMode = 'fill';

      const rect = component['computeRect'](image(800, 400), 600, 800);

      // The other edge is matched, so the image covers the page and spills off the sides.
      expect(rect.h).toBeCloseTo(800, 6);
      expect(rect.w).toBeCloseTo(1600, 6);
      expect(rect.x).toBeCloseTo(-500, 6);
      expect(rect.y).toBeCloseTo(0, 6);
    });

    it('should keep the aspect ratio in both fit and fill', () => {
      const ratio = 800 / 600;

      component.fitMode = 'fit';
      const fitted = component['computeRect'](image(800, 600), 595, 842);
      expect(fitted.w / fitted.h).toBeCloseTo(ratio, 6);

      component.fitMode = 'fill';
      const filled = component['computeRect'](image(800, 600), 595, 842);
      expect(filled.w / filled.h).toBeCloseTo(ratio, 6);
    });

    it('should fall back to the full page rather than produce NaN', () => {
      component.fitMode = 'fit';

      expect(component['computeRect'](image(0, 0), 595, 842)).toEqual({
        x: 0,
        y: 0,
        w: 595,
        h: 842,
      });
    });
  });

  describe('jpeg layout', () => {
    it('should walk the segments up to the scan header', () => {
      const bytes = jpeg(app0(), dht(), sof0(1024, 768), sos(), [0x12, 0x34], [0xff, 0xd9]);

      const layout = readLayout(bytes)!;

      expect(layout.segments.map((s) => s.marker)).toEqual([0xe0, 0xc4, 0xc0, 0xda]);
      expect(layout.sofIndex).toBe(2);
      // Everything past the scan header is entropy-coded data, not segments.
      expect(layout.scanStart).toBe(layout.segments[3].end);
    });

    it('should read the frame dimensions from the sof segment', () => {
      const bytes = jpeg(app0(), sof0(1024, 768), sos());
      const layout = readLayout(bytes)!;
      const sof = layout.segments[layout.sofIndex];

      expect((bytes[sof.start + 5] << 8) | bytes[sof.start + 6]).toBe(768);
      expect((bytes[sof.start + 7] << 8) | bytes[sof.start + 8]).toBe(1024);
      expect(bytes[sof.start + 9]).toBe(3);
    });

    it('should not mistake a huffman table for a frame header', () => {
      const layout = readLayout(jpeg(app0(), dht(), sos()))!;

      // C4 is a Huffman table, not a frame — the file genuinely has no SOF.
      expect(layout.sofIndex).toBe(-1);
    });

    it('should skip fill bytes and restart markers', () => {
      const bytes = jpeg(app0(), [0xff, 0xff], [0xff, 0xd0], sof0(64, 64), sos());

      const layout = readLayout(bytes)!;

      expect(layout.segments.map((s) => s.marker)).toEqual([0xe0, 0xc0, 0xda]);
      expect(layout.sofIndex).toBe(1);
    });

    it('should give up on a malformed file', () => {
      // No 0xFF where a marker has to be.
      expect(readLayout(new Uint8Array([0xff, 0xd8, 0x00, 0x00, 0x00, 0x00]))).toBeNull();
      // A length that runs past the end of the file.
      expect(readLayout(jpeg([0xff, 0xe0, 0x7f, 0xff]))).toBeNull();
      // An end-of-image before any scan header.
      expect(readLayout(jpeg([0xff, 0xd9]))).toBeNull();
    });
  });

  describe('jsPDF frame-header workaround', () => {
    it('should spot a file jsPDF misreads', () => {
      const bytes = jpeg(app0(), dht(), sof0(1024, 768), sos(), [0xff, 0xd9]);
      const layout = readLayout(bytes)!;
      const sofStart = layout.segments[layout.sofIndex].start;

      // jsPDF stops at the first C0-C7 marker, which here is the Huffman table.
      expect(component['jsPdfReadsFrameAt'](bytes, sofStart)).toBe(false);
    });

    it('should accept a file whose frame header already comes first', () => {
      const bytes = jpeg(app0(), sof0(1024, 768), dht(), sos(), [0xff, 0xd9]);
      const layout = readLayout(bytes)!;

      expect(
        component['jsPdfReadsFrameAt'](bytes, layout.segments[layout.sofIndex].start)
      ).toBe(true);
    });

    it('should move the confusable tables behind the frame header', () => {
      const bytes = jpeg(app0(), dht(), sof0(1024, 768), sos(), [0xff, 0xd9]);
      const layout = readLayout(bytes)!;

      const rebuilt = component['reorderJpegForJsPdf'](bytes, layout);
      const rebuiltLayout = readLayout(rebuilt.bytes)!;

      expect(rebuiltLayout.segments.map((s) => s.marker)).toEqual([0xe0, 0xc0, 0xc4, 0xda]);
      expect(rebuiltLayout.segments[rebuiltLayout.sofIndex].start).toBe(rebuilt.sofStart);
      expect(component['jsPdfReadsFrameAt'](rebuilt.bytes, rebuilt.sofStart)).toBe(true);
    });

    it('should keep the frame header intact through the rewrite', () => {
      const bytes = jpeg(app0(), dht(), sof0(1024, 768), sos(), [0xff, 0xd9]);
      const rebuilt = component['reorderJpegForJsPdf'](bytes, readLayout(bytes)!);
      const at = rebuilt.sofStart;

      expect((rebuilt.bytes[at + 5] << 8) | rebuilt.bytes[at + 6]).toBe(768);
      expect((rebuilt.bytes[at + 7] << 8) | rebuilt.bytes[at + 8]).toBe(1024);
    });

    it('should start the rewrite with a fresh start-of-image', () => {
      const bytes = jpeg(app0(), dht(), sof0(16, 16), sos(), [0xff, 0xd9]);
      const rebuilt = component['reorderJpegForJsPdf'](bytes, readLayout(bytes)!);

      expect(rebuilt.bytes[0]).toBe(0xff);
      expect(rebuilt.bytes[1]).toBe(0xd8);
    });

    it('should carry the scan data over and drop anything past the end marker', () => {
      const scan = [0x11, 0x22, 0x33];
      const trailer = [0xde, 0xad, 0xbe, 0xef];
      const bytes = jpeg(app0(), dht(), sof0(16, 16), sos(), scan, [0xff, 0xd9], trailer);

      const rebuilt = component['reorderJpegForJsPdf'](bytes, readLayout(bytes)!);
      const out = Array.from(rebuilt.bytes);

      expect(out.slice(-2)).toEqual([0xff, 0xd9]);
      expect(out.slice(-5, -2)).toEqual(scan);
      // A gain map or similar trailing payload is weight the PDF does not need.
      expect(rebuilt.bytes.length).toBe(bytes.length - trailer.length);
    });
  });

  describe('the image list', () => {
    it('should drop an image by id and leave the rest alone', () => {
      component.images = [entry('a.png'), entry('b.png'), entry('c.png')];
      const removed = component.images[1].id;

      component.removeImage(removed);

      expect(component.images.map((i) => i.name)).toEqual(['a.png', 'c.png']);
    });

    it('should ignore a remove for an id that is not there', () => {
      component.images = [entry('a.png')];

      component.removeImage(999);

      expect(component.images.length).toBe(1);
    });

    it('should sort names by number, not by digit', () => {
      component.images = [entry('IMG_10.png'), entry('IMG_2.png'), entry('IMG_1.png')];

      component.toggleSort();

      expect(component.images.map((i) => i.name)).toEqual([
        'IMG_1.png',
        'IMG_2.png',
        'IMG_10.png',
      ]);
      expect(component.sortDirection).toBe('asc');
      expect(component.sortLabel).toBe('Sorted A→Z');
    });

    it('should flip to descending on a second sort', () => {
      component.images = [entry('IMG_1.png'), entry('IMG_10.png'), entry('IMG_2.png')];

      component.toggleSort();
      component.toggleSort();

      expect(component.images.map((i) => i.name)).toEqual([
        'IMG_10.png',
        'IMG_2.png',
        'IMG_1.png',
      ]);
      expect(component.sortDirection).toBe('desc');
      expect(component.sortLabel).toBe('Sorted Z→A');
    });

    it('should move an image up and clear the sort', () => {
      component.images = [entry('a.png'), entry('b.png'), entry('c.png')];
      component.sortDirection = 'asc';

      component.moveUp(2);

      expect(component.images.map((i) => i.name)).toEqual(['a.png', 'c.png', 'b.png']);
      expect(component.sortDirection).toBeNull();
      expect(component.sortLabel).toBe('Sort A→Z');
    });

    it('should move an image down', () => {
      component.images = [entry('a.png'), entry('b.png'), entry('c.png')];

      component.moveDown(0);

      expect(component.images.map((i) => i.name)).toEqual(['b.png', 'a.png', 'c.png']);
    });

    it('should not move past either end of the list', () => {
      component.images = [entry('a.png'), entry('b.png')];
      component.sortDirection = 'asc';

      component.moveUp(0);
      component.moveDown(1);

      expect(component.images.map((i) => i.name)).toEqual(['a.png', 'b.png']);
      // Nothing moved, so the sort label still stands.
      expect(component.sortDirection).toBe('asc');
    });

    it('should reorder on a drag and clear the sort', () => {
      component.images = [entry('a.png'), entry('b.png'), entry('c.png')];
      component.sortDirection = 'asc';

      component.onListDrop({ previousIndex: 0, currentIndex: 2 } as never);

      expect(component.images.map((i) => i.name)).toEqual(['b.png', 'c.png', 'a.png']);
      expect(component.sortDirection).toBeNull();
    });

    it('should ignore a drag that lands where it started', () => {
      component.images = [entry('a.png'), entry('b.png')];
      component.sortDirection = 'asc';

      component.onListDrop({ previousIndex: 1, currentIndex: 1 } as never);

      expect(component.images.map((i) => i.name)).toEqual(['a.png', 'b.png']);
      expect(component.sortDirection).toBe('asc');
    });

    it('should empty the list and reset the sort', () => {
      component.images = [entry('a.png')];
      component.sortDirection = 'desc';

      component.clearAll();

      expect(component.images).toEqual([]);
      expect(component.sortDirection).toBeNull();
    });
  });

  describe('list counts', () => {
    it('should count usable and broken images apart', () => {
      component.images = [entry('a.png', true), entry('b.png', false), entry('c.png', true)];

      expect(component.usableCount).toBe(2);
      expect(component.brokenCount).toBe(1);
    });

    it('should report loading while any image is still decoding', () => {
      component.images = [entry('a.png', true), entry('b.png', null)];

      expect(component.isLoading).toBe(true);

      component.images = [entry('a.png', true), entry('b.png', false)];

      expect(component.isLoading).toBe(false);
    });

    it('should allow generating once at least one image decoded', () => {
      component.images = [entry('a.png', true), entry('b.png', false)];

      expect(component.canGenerate).toBe(true);
    });

    it('should block generating with nothing usable', () => {
      component.images = [entry('a.png', false)];

      expect(component.canGenerate).toBe(false);
    });

    it('should block generating while decoding or already running', () => {
      component.images = [entry('a.png', true), entry('b.png', null)];
      expect(component.canGenerate).toBe(false);

      component.images = [entry('a.png', true)];
      component.isGenerating = true;
      expect(component.canGenerate).toBe(false);
    });
  });

  describe('drop-zone state', () => {
    it('should highlight on drag over and clear on leave', () => {
      const event = { preventDefault: () => undefined } as DragEvent;

      component.onDragOver(event);
      expect(component.isDragging).toBe(true);

      component.onDragLeave();
      expect(component.isDragging).toBe(false);
    });

    it('should clear the highlight on drop', () => {
      component.onDragOver({ preventDefault: () => undefined } as DragEvent);

      component.onDrop({ preventDefault: () => undefined, dataTransfer: null } as DragEvent);

      expect(component.isDragging).toBe(false);
    });
  });
});
