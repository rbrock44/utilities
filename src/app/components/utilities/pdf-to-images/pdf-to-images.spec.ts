import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfToImagesComponent } from './pdf-to-images';

describe('PdfToImagesComponent', () => {
  let component: PdfToImagesComponent;
  let fixture: ComponentFixture<PdfToImagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfToImagesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfToImagesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should treat an empty box as every page', () => {
    expect(component.parsePages('', 3)).toEqual([1, 2, 3]);
    expect(component.parsePages('   ', 3)).toEqual([1, 2, 3]);
    expect(component.parsePages('All', 2)).toEqual([1, 2]);
  });

  it('should read single pages, ranges, and lists', () => {
    expect(component.parsePages('2', 5)).toEqual([2]);
    expect(component.parsePages('2-4', 5)).toEqual([2, 3, 4]);
    expect(component.parsePages('1, 4-5', 5)).toEqual([1, 4, 5]);
  });

  it('should read open-ended ranges from the first and last page', () => {
    expect(component.parsePages('3-', 5)).toEqual([3, 4, 5]);
    expect(component.parsePages('-2', 5)).toEqual([1, 2]);
  });

  it('should keep the written order and drop repeats', () => {
    expect(component.parsePages('3,1,3,2', 5)).toEqual([3, 1, 2]);
  });

  it('should reject pages outside the document', () => {
    expect(component.parsePages('0', 5)).toBeNull();
    expect(component.parsePages('6', 5)).toBeNull();
    expect(component.parsePages('4-2', 5)).toBeNull();
    expect(component.parsePages('2-9', 5)).toBeNull();
  });

  it('should reject anything that is not a page list', () => {
    expect(component.parsePages('two', 5)).toBeNull();
    expect(component.parsePages('1;2', 5)).toBeNull();
    expect(component.parsePages(',', 5)).toBeNull();
  });

  it('should describe the selection', () => {
    component.pageCount = 4;

    expect(component.selectionLabel).toBe('All 4 pages');

    component.pageSpec = '2-3';
    expect(component.selectionLabel).toBe('2 of 4 pages');

    component.pageSpec = '9';
    expect(component.selectionLabel).toBe('Enter page numbers between 1 and 4');
  });

  it('should pad page numbers to the width of the page count', () => {
    component.format = 'image/png';

    expect(component.fileNameFor(7, 9)).toBe('document-page-7.png');
    expect(component.fileNameFor(7, 120)).toBe('document-page-007.png');
  });

  it('should name files after the pdf and the chosen format', () => {
    component.file = new File([new Uint8Array([1])], 'Report.PDF', {
      type: 'application/pdf',
    });
    component.format = 'image/jpeg';

    expect(component.fileNameFor(2, 10)).toBe('Report-page-02.jpg');
  });

  it('should not offer to render before a document is open', () => {
    expect(component.canRender).toBe(false);
  });
});
