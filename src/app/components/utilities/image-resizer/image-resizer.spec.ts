import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageResizerComponent } from './image-resizer';

describe('ImageResizerComponent', () => {
  let component: ImageResizerComponent;
  let fixture: ComponentFixture<ImageResizerComponent>;

  const loadFakeImage = (width = 800, height = 600, type = 'image/png') => {
    component.originalWidth = width;
    component.originalHeight = height;
    component.originalSize = 100000;
    component.originalType = type;
    component.targetWidth = width;
    component.targetHeight = height;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageResizerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageResizerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should keep the aspect ratio when width changes', () => {
    loadFakeImage();
    component.targetWidth = 400;
    component.onWidthChange();

    expect(component.targetHeight).toBe(300);
  });

  it('should keep the aspect ratio when height changes', () => {
    loadFakeImage();
    component.targetHeight = 300;
    component.onHeightChange();

    expect(component.targetWidth).toBe(400);
  });

  it('should leave the other dimension alone when the ratio is unlocked', () => {
    loadFakeImage();
    component.lockAspect = false;
    component.targetWidth = 400;
    component.onWidthChange();

    expect(component.targetHeight).toBe(600);
  });

  it('should scale both dimensions by percentage', () => {
    loadFakeImage();
    component.percent = 50;
    component.onPercentChange();

    expect(component.targetWidth).toBe(400);
    expect(component.targetHeight).toBe(300);
  });

  it('should never scale below one pixel', () => {
    loadFakeImage(10, 10);
    component.percent = 1;
    component.onPercentChange();

    expect(component.targetWidth).toBeGreaterThanOrEqual(1);
    expect(component.targetHeight).toBeGreaterThanOrEqual(1);
  });

  it('should resolve "keep original" to the source type', () => {
    loadFakeImage(800, 600, 'image/jpeg');
    component.format = 'original';

    expect(component.outputMime).toBe('image/jpeg');
  });

  it('should fall back to PNG for source types canvas cannot re-encode', () => {
    loadFakeImage(800, 600, 'image/svg+xml');
    component.format = 'original';

    expect(component.outputMime).toBe('image/png');
  });

  it('should only use quality for lossy formats', () => {
    loadFakeImage();

    component.format = 'image/png';
    expect(component.usesQuality).toBe(false);

    component.format = 'image/jpeg';
    expect(component.usesQuality).toBe(true);

    component.format = 'image/webp';
    expect(component.usesQuality).toBe(true);
  });

  it('should warn when converting a transparent format to JPEG', () => {
    loadFakeImage(800, 600, 'image/png');
    component.format = 'image/jpeg';

    expect(component.flattensAlpha).toBe(true);
  });

  it('should not warn about alpha when the source is already JPEG', () => {
    loadFakeImage(800, 600, 'image/jpeg');
    component.format = 'image/jpeg';

    expect(component.flattensAlpha).toBe(false);
  });

  it('should map output formats to file extensions', () => {
    loadFakeImage();

    component.format = 'image/jpeg';
    expect(component.outputExtension).toBe('jpg');

    component.format = 'image/webp';
    expect(component.outputExtension).toBe('webp');

    component.format = 'image/png';
    expect(component.outputExtension).toBe('png');
  });

  it('should report the size change against the original', () => {
    loadFakeImage();
    component.outputSize = 50000;

    expect(component.sizeDelta).toBeCloseTo(-50, 5);
  });

  it('should report no size change before anything is encoded', () => {
    loadFakeImage();
    component.outputSize = 0;

    expect(component.sizeDelta).toBe(0);
  });

  it('should format byte counts for humans', () => {
    expect(component.formatBytes(512)).toBe('512 B');
    expect(component.formatBytes(2048)).toBe('2.0 KB');
    expect(component.formatBytes(5 * 1024 * 1024)).toBe('5.00 MB');
  });

  it('should reset the size back to the original dimensions', () => {
    loadFakeImage();
    component.targetWidth = 100;
    component.targetHeight = 75;
    component.percent = 12;

    component.resetSize();

    expect(component.targetWidth).toBe(800);
    expect(component.targetHeight).toBe(600);
    expect(component.percent).toBe(100);
  });
});
