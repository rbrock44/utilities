import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaviconGeneratorComponent } from './favicon-generator';

describe('FaviconGeneratorComponent', () => {
  let component: FaviconGeneratorComponent;
  let fixture: ComponentFixture<FaviconGeneratorComponent>;

  const png = (marker: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, marker]);

  const readU32 = (bytes: Uint8Array, at: number) =>
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(at, true);

  const readU16 = (bytes: Uint8Array, at: number) =>
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(at, true);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaviconGeneratorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FaviconGeneratorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should write an ico directory that points at each image', () => {
    const ico = component.buildIco([
      { size: 16, bytes: png(1) },
      { size: 32, bytes: png(2) },
    ]);

    expect(readU16(ico, 0)).toBe(0);
    expect(readU16(ico, 2)).toBe(1);
    expect(readU16(ico, 4)).toBe(2);

    const firstOffset = readU32(ico, 6 + 12);
    const secondOffset = readU32(ico, 22 + 12);
    expect(ico[6]).toBe(16);
    expect(ico[22]).toBe(32);
    expect(firstOffset).toBe(6 + 32);
    expect(secondOffset).toBe(firstOffset + 5);
    expect(ico[firstOffset + 4]).toBe(1);
    expect(ico[secondOffset + 4]).toBe(2);
    expect(ico.length).toBe(6 + 32 + 10);
  });

  it('should store 256 pixel entries as a zero size byte', () => {
    const ico = component.buildIco([{ size: 256, bytes: png(3) }]);

    expect(ico[6]).toBe(0);
    expect(ico[7]).toBe(0);
  });

  it('should build a zip with a central directory for every entry', () => {
    const zip = component.buildZip([
      { name: 'favicon.ico', bytes: png(1) },
      { name: 'site.webmanifest', bytes: new TextEncoder().encode('{}') },
    ]);

    expect(readU32(zip, 0)).toBe(0x04034b50);
    expect(readU16(zip, 8)).toBe(0);

    const end = zip.length - 22;
    expect(readU32(zip, end)).toBe(0x06054b50);
    expect(readU16(zip, end + 10)).toBe(2);

    const centralOffset = readU32(zip, end + 16);
    expect(readU32(zip, centralOffset)).toBe(0x02014b50);
    // Stored entries repeat the size in both the compressed and uncompressed fields.
    expect(readU32(zip, centralOffset + 20)).toBe(5);
    expect(readU32(zip, centralOffset + 24)).toBe(5);
    expect(readU32(zip, end + 12)).toBe(zip.length - 22 - centralOffset);
  });

  it('should checksum zip entries so the archive verifies', () => {
    const zip = component.buildZip([
      { name: 'a.txt', bytes: new TextEncoder().encode('123456789') },
    ]);

    // The CRC-32 of "123456789" is the standard check value for the algorithm.
    expect(readU32(zip, 14)).toBe(0xcbf43926);
  });

  it('should list only the selected sizes in the head snippet', () => {
    component.sizes = component.sizes.map((entry) => ({
      ...entry,
      selected: entry.size === 32 || entry.size === 180,
    }));

    const snippet = component.htmlSnippet;

    expect(snippet).toContain('href="/favicon.ico"');
    expect(snippet).toContain('sizes="32x32"');
    expect(snippet).toContain('rel="apple-touch-icon"');
    expect(snippet).not.toContain('16x16');
    expect(snippet).toContain('rel="manifest"');
  });

  it('should put only the large icons in the manifest', () => {
    component.appName = '  Utilities  ';
    component.transparent = false;
    component.backgroundColor = '#101820';

    const manifest = JSON.parse(component.manifestJson);

    expect(manifest.name).toBe('Utilities');
    expect(manifest.theme_color).toBe('#101820');
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
      '192x192',
      '512x512',
    ]);
  });

  it('should fall back to a placeholder manifest name', () => {
    component.appName = '   ';

    expect(JSON.parse(component.manifestJson).name).toBe('My site');
  });
});
