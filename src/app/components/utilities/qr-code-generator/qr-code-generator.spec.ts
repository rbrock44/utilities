import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrCodeGeneratorComponent } from './qr-code-generator';

describe('QrCodeGeneratorComponent', () => {
  let component: QrCodeGeneratorComponent;
  let fixture: ComponentFixture<QrCodeGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrCodeGeneratorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrCodeGeneratorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clamp the size into the supported range', () => {
    component.size = 10;
    expect(component.clampedSize).toBe(64);

    component.size = 999999;
    expect(component.clampedSize).toBe(2048);

    component.size = 512;
    expect(component.clampedSize).toBe(512);
  });

  it('should fall back to a default size for unusable input', () => {
    component.size = Number.NaN;

    expect(component.clampedSize).toBe(512);
  });

  it('should clamp the quiet zone', () => {
    component.margin = -5;
    expect(component.clampedMargin).toBe(0);

    component.margin = 100;
    expect(component.clampedMargin).toBe(20);
  });

  it('should round fractional sizes', () => {
    component.size = 300.6;

    expect(component.clampedSize).toBe(301);
  });

  it('should measure content in UTF-8 bytes', () => {
    component.content = 'abc';
    expect(component.byteLength).toBe(3);

    component.content = '😀';
    expect(component.byteLength).toBe(4);
  });

  it('should treat whitespace-only content as empty', () => {
    component.content = '   ';
    expect(component.hasContent).toBe(false);

    component.content = 'x';
    expect(component.hasContent).toBe(true);
  });

  it('should clear the output when content is emptied', async () => {
    component.content = '';
    await component.render();

    expect(component.dataUrl).toBeNull();
    expect(component.svg).toBe('');
    expect(component.errorMessage).toBeNull();
  });

  it('should reject a payload too large for the error-correction level', async () => {
    component.content = 'x'.repeat(5000);
    component.errorLevel = 'H';
    await component.render();

    expect(component.errorMessage).toContain('too much data');
    expect(component.svg).toBe('');
  });

  it('should suggest lowering the level only when it can still be lowered', async () => {
    component.content = 'x'.repeat(5000);

    component.errorLevel = 'H';
    await component.render();
    expect(component.errorMessage).toContain('lower level');

    component.errorLevel = 'L';
    await component.render();
    expect(component.errorMessage).not.toContain('lower level');
  });

  it('should update the picked foreground colour from the swatch', () => {
    const event = { target: { value: '#ff8800' } } as unknown as Event;
    component.onForegroundPicked(event);

    expect(component.foreground).toBe('#FF8800');
  });

  it('should update the picked background colour from the swatch', () => {
    const event = { target: { value: '#00ff00' } } as unknown as Event;
    component.onBackgroundPicked(event);

    expect(component.background).toBe('#00FF00');
  });
});
