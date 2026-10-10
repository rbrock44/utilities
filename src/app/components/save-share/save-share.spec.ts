import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveShareComponent } from './save-share';
import { SavedListStore } from '../../services/saved-lists';

const isNumbers = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(n => typeof n === 'number');

describe('SaveShareComponent', () => {
  let fixture: ComponentFixture<SaveShareComponent<number[]>>;
  let component: SaveShareComponent<number[]>;
  let lists: SavedListStore<number[]>;

  const set = (inputs: Record<string, unknown>) => {
    Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    await TestBed.configureTestingModule({
      imports: [SaveShareComponent]
    })
    .compileComponents();

    lists = new SavedListStore('test-lists', isNumbers);
    fixture = TestBed.createComponent(SaveShareComponent<number[]>);
    component = fixture.componentInstance;
    set({ store: lists, describe: (items: number[]) => `${items.length} items` });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should need a name and a list to save, and an encoded list to share', () => {
    expect(component.canSave()).toBe(false);
    expect(component.canShare()).toBe(false);

    set({ items: [1, 2] });
    expect(component.canSave()).toBe(false);

    component.name.set('   ');
    expect(component.canSave()).toBe(false);

    component.name.set('Mine');
    set({ shareValue: 'abc' });
    expect(component.canSave()).toBe(true);
    expect(component.canShare()).toBe(true);
  });

  it('should save under the trimmed name and list it with its description', () => {
    set({ items: [1, 2, 3] });
    component.name.set('  Client A  ');
    component.save();
    fixture.detectChanges();

    expect(lists.lists()[0]).toEqual(expect.objectContaining({ name: 'Client A', items: [1, 2, 3] }));
    expect(component.notice()).toBe('Saved “Client A” in this browser.');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('3 items');
  });

  it('should hand a loaded list back to the host and take its name', () => {
    lists.save('Client B', [9]);
    const loaded: unknown[] = [];
    component.loadList.subscribe(list => loaded.push(list.items));

    component.load(lists.lists()[0]);

    expect(loaded).toEqual([[9]]);
    expect(component.name()).toBe('Client B');
  });

  it('should delete a saved list', () => {
    lists.save('Old', [1]);
    component.remove(lists.lists()[0]);

    expect(lists.lists()).toEqual([]);
    expect(component.notice()).toBe('Deleted “Old”.');
  });

  it('should copy a link with the list and name in the query', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    set({ shareValue: 'a~1_b~2', shareParam: 'stack' });
    component.name.set('Dimes & more');

    await component.copyLink();

    const url = new URL(writeText.mock.calls[0][0]);
    expect(url.searchParams.get('stack')).toBe('a~1_b~2');
    expect(url.searchParams.get('name')).toBe('Dimes & more');
    expect(component.justCopied()).toBe(true);
  });

  it('should leave the name out of the link when blank and not copy without a list', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await component.copyLink();
    expect(writeText).not.toHaveBeenCalled();

    set({ shareValue: 'x' });
    await component.copyLink();
    expect(new URL(writeText.mock.calls[0][0]).searchParams.has('name')).toBe(false);
  });
});
