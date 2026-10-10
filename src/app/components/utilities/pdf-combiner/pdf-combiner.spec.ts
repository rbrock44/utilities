import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfCombinerComponent } from './pdf-combiner';

describe('PdfCombinerComponent', () => {
  let component: PdfCombinerComponent;
  let fixture: ComponentFixture<PdfCombinerComponent>;

  const entry = (id: number, name: string, pageCount: number | null = 1) => ({
    id,
    name,
    pageCount,
    file: new File([], name, { type: 'application/pdf' })
  });

  const names = () => component.pdfs.map(p => p.name);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfCombinerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfCombinerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should only accept PDF files from the file picker', () => {
    const input = {
      files: [
        new File([], 'a.pdf', { type: 'application/pdf' }),
        new File([], 'b.png', { type: 'image/png' })
      ],
      value: 'C:\\fakepath\\a.pdf'
    };
    component.onFileInputChange({ target: input } as unknown as Event);

    expect(names()).toEqual(['a.pdf']);
    expect(input.value).toBe('');
  });

  it('should sort numerically so 2 comes before 10, then flip on a second click', () => {
    component.pdfs = [entry(1, 'Scan 10.pdf'), entry(2, 'scan 2.pdf'), entry(3, 'Scan 1.pdf')];

    component.toggleSort();
    expect(names()).toEqual(['Scan 1.pdf', 'scan 2.pdf', 'Scan 10.pdf']);
    expect(component.sortLabel).toBe('Sorted A→Z');

    component.toggleSort();
    expect(names()).toEqual(['Scan 10.pdf', 'scan 2.pdf', 'Scan 1.pdf']);
    expect(component.sortLabel).toBe('Sorted Z→A');
  });

  it('should reorder with move up and down and drop the sort label', () => {
    component.pdfs = [entry(1, 'a.pdf'), entry(2, 'b.pdf'), entry(3, 'c.pdf')];
    component.toggleSort();

    component.moveDown(0);
    expect(names()).toEqual(['b.pdf', 'a.pdf', 'c.pdf']);
    expect(component.sortDirection).toBeNull();

    component.moveUp(2);
    expect(names()).toEqual(['b.pdf', 'c.pdf', 'a.pdf']);
  });

  it('should ignore moves past either end', () => {
    component.pdfs = [entry(1, 'a.pdf'), entry(2, 'b.pdf')];

    component.moveUp(0);
    component.moveDown(1);
    expect(names()).toEqual(['a.pdf', 'b.pdf']);
  });

  it('should reorder on drag and drop', () => {
    component.pdfs = [entry(1, 'a.pdf'), entry(2, 'b.pdf'), entry(3, 'c.pdf')];

    component.onListDrop({ previousIndex: 0, currentIndex: 2 } as never);
    expect(names()).toEqual(['b.pdf', 'c.pdf', 'a.pdf']);
  });

  it('should need at least two files to merge', () => {
    component.pdfs = [entry(1, 'a.pdf')];
    expect(component.canMerge).toBe(false);

    component.pdfs.push(entry(2, 'b.pdf'));
    expect(component.canMerge).toBe(true);

    component.isMerging = true;
    expect(component.canMerge).toBe(false);
  });

  it('should total known page counts and skip unreadable files', () => {
    component.pdfs = [entry(1, 'a.pdf', 3), entry(2, 'b.pdf', null), entry(3, 'c.pdf', 4)];
    expect(component.totalPages).toBe(7);
  });

  it('should remove one file or clear them all', () => {
    component.pdfs = [entry(1, 'a.pdf'), entry(2, 'b.pdf')];

    component.removeFile(1);
    expect(names()).toEqual(['b.pdf']);

    component.clearAll();
    expect(component.pdfs).toEqual([]);
  });
});
