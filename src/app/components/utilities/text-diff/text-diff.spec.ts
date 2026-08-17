import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextDiffComponent } from './text-diff';

describe('TextDiffComponent', () => {
  let component: TextDiffComponent;
  let fixture: ComponentFixture<TextDiffComponent>;

  const compare = (left: string, right: string) => {
    component.original = left;
    component.changed = right;
    component.compare();
  };

  const texts = (kind: 'same' | 'added' | 'removed') =>
    component.rows.filter((row) => row.kind === kind).map((row) => row.text);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextDiffComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextDiffComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should report identical text as unchanged', () => {
    compare('one\ntwo', 'one\ntwo');

    expect(component.identical).toBe(true);
    expect(component.summary.unchanged).toBe(2);
    expect(component.summary.added).toBe(0);
    expect(component.summary.removed).toBe(0);
  });

  it('should detect an added line', () => {
    compare('one\ntwo', 'one\nmiddle\ntwo');

    expect(texts('added')).toEqual(['middle']);
    expect(component.summary.removed).toBe(0);
  });

  it('should detect a removed line', () => {
    compare('one\nmiddle\ntwo', 'one\ntwo');

    expect(texts('removed')).toEqual(['middle']);
    expect(component.summary.added).toBe(0);
  });

  it('should show a changed line as one removal and one addition', () => {
    compare('one\ntwo\nthree', 'one\nTWO CHANGED\nthree');

    expect(texts('removed')).toEqual(['two']);
    expect(texts('added')).toEqual(['TWO CHANGED']);
    expect(component.summary.unchanged).toBe(2);
  });

  it('should keep the longest common subsequence rather than realigning everything', () => {
    compare('a\nb\nc\nd', 'a\nx\nc\nd');

    expect(component.summary.unchanged).toBe(3);
    expect(component.summary.added).toBe(1);
    expect(component.summary.removed).toBe(1);
  });

  it('should number lines against their own side', () => {
    compare('one\ntwo', 'one\nmiddle\ntwo');

    const added = component.rows.find((row) => row.kind === 'added');
    expect(added!.leftNumber).toBeNull();
    expect(added!.rightNumber).toBe(2);
  });

  it('should ignore case when asked', () => {
    component.ignoreCase = true;
    compare('Hello', 'hello');

    expect(component.identical).toBe(true);
  });

  it('should treat case as significant by default', () => {
    compare('Hello', 'hello');

    expect(component.identical).toBe(false);
  });

  it('should ignore whitespace differences when asked', () => {
    component.ignoreWhitespace = true;
    compare('  hello   world  ', 'hello world');

    expect(component.identical).toBe(true);
  });

  it('should display the original text even when matching loosely', () => {
    component.ignoreCase = true;
    compare('HELLO', 'hello');

    expect(component.rows[0].text).toBe('hello');
  });

  it('should compare word by word when set to word granularity', () => {
    component.granularity = 'word';
    compare('the quick brown fox', 'the slow brown fox');

    expect(texts('removed')).toEqual(['quick']);
    expect(texts('added')).toEqual(['slow']);
  });

  it('should treat an empty original as all additions', () => {
    compare('', 'one\ntwo');

    expect(component.summary.added).toBe(2);
    expect(component.summary.removed).toBe(0);
  });

  it('should treat an empty changed side as all removals', () => {
    compare('one\ntwo', '');

    expect(component.summary.removed).toBe(2);
    expect(component.summary.added).toBe(0);
  });

  it('should hide unchanged rows when asked', () => {
    compare('a\nb\nc', 'a\nX\nc');
    component.hideUnchanged = true;

    expect(component.visibleRows.every((row) => row.kind !== 'same')).toBe(true);
    expect(component.rows.length).toBeGreaterThan(component.visibleRows.length);
  });

  it('should swap the two sides', () => {
    compare('one', 'two');
    component.swap();

    expect(component.original).toBe('two');
    expect(component.changed).toBe('one');
    expect(texts('removed')).toEqual(['two']);
  });

  it('should refuse input beyond the size cap', () => {
    const huge = Array.from({ length: 5000 }, (_, i) => `line ${i}`).join('\n');
    compare(huge, 'one');

    expect(component.errorMessage).toContain('too much');
    expect(component.rows.length).toBe(0);
  });

  it('should clear both sides', () => {
    compare('one', 'two');
    component.clear();

    expect(component.original).toBe('');
    expect(component.changed).toBe('');
    expect(component.rows.length).toBe(0);
  });
});
