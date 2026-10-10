import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfPageUtilityComponent } from './pdf-page-utility';

describe('PdfPageUtilityComponent', () => {
  let component: PdfPageUtilityComponent;
  let fixture: ComponentFixture<PdfPageUtilityComponent>;

  /** Stands in for a loaded PDF; parsing the range is what is under test, not pdf-lib. */
  const select = (pageRange: string, mode: 'extract' | 'remove' = 'extract', pageCount = 10) => {
    component.file = new File([], 'doc.pdf', { type: 'application/pdf' });
    component.pageCount = pageCount;
    component.pageRange = pageRange;
    component.mode = mode;
    component.onOptionsChange();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfPageUtilityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfPageUtilityComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should extract single pages and ranges in the order given', () => {
    select('1, 3-5, 9');

    expect(component.resultPages).toEqual([1, 3, 4, 5, 9]);
    expect(component.rangeError).toBeNull();
    expect(component.canDownload).toBe(true);
  });

  it('should support descending ranges to reverse pages', () => {
    select('4-2');
    expect(component.resultPages).toEqual([4, 3, 2]);
  });

  it('should tolerate spaces and empty tokens', () => {
    select(' 2 - 3 ,, 6 ');
    expect(component.resultPages).toEqual([2, 3, 6]);
  });

  it('should keep every page not listed in remove mode', () => {
    select('2-4, 7', 'remove', 8);
    expect(component.resultPages).toEqual([1, 5, 6, 8]);
  });

  it('should refuse to remove every page', () => {
    select('1-3', 'remove', 3);

    expect(component.rangeError).toBe('That would remove every page.');
    expect(component.canDownload).toBe(false);
  });

  it('should reject pages outside the document', () => {
    select('0');
    expect(component.rangeError).toContain('Page 0 is out of range, this PDF has 10 pages');

    select('2-11');
    expect(component.rangeError).toContain('Page 11 is out of range');

    select('2', 'extract', 1);
    expect(component.rangeError).toContain('this PDF has 1 page.');
  });

  it('should reject tokens that are not pages or ranges', () => {
    select('1, two');
    expect(component.rangeError).toBe('"two" is not a valid page or range.');
    expect(component.resultPages).toEqual([]);
  });

  it('should summarize the result as compact ranges', () => {
    select('1-3, 5, 7-8, 10');
    expect(component.resultSummary).toBe('1-3, 5, 7-8, 10');
  });

  it('should reject a dropped file that is not a PDF', () => {
    const event = {
      preventDefault: () => undefined,
      dataTransfer: { files: [new File([], 'photo.png', { type: 'image/png' })] }
    } as unknown as DragEvent;

    component.onDrop(event);

    expect(component.errorMessage).toBe('Only PDF files are accepted.');
    expect(component.file).toBeNull();
  });

  it('should reset everything on clear', () => {
    select('1-3', 'remove');
    component.clear();

    expect(component.file).toBeNull();
    expect(component.pageCount).toBe(0);
    expect(component.mode).toBe('extract');
    expect(component.resultPages).toEqual([]);
  });
});
