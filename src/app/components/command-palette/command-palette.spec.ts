import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { CommandPaletteComponent } from './command-palette';
import { CommandPaletteService } from '../../services/command-palette';
import { FavoritesService } from '../../services/favorites';

describe('CommandPaletteComponent', () => {
  let component: CommandPaletteComponent;
  let fixture: ComponentFixture<CommandPaletteComponent>;
  let palette: CommandPaletteService;
  let favorites: FavoritesService;
  let router: Router;

  const press = (key: string, init: KeyboardEventInit = {}) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
    fixture.detectChanges();
  };

  const pressInPalette = (key: string, init: KeyboardEventInit = {}) => {
    component.onKeydown(new KeyboardEvent('keydown', { key, ...init }));
    fixture.detectChanges();
  };

  const element = () => fixture.nativeElement as HTMLElement;
  const titles = () => Array.from(element().querySelectorAll('.item .title')).map(t => t.textContent);
  const sectionLabels = () => component.sections().map(section => section.label);
  const activeTitle = () => element().querySelector('.item.active .title')?.textContent;

  beforeEach(async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    await TestBed.configureTestingModule({
      imports: [CommandPaletteComponent],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommandPaletteComponent);
    component = fixture.componentInstance;
    palette = TestBed.inject(CommandPaletteService);
    favorites = TestBed.inject(FavoritesService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should render nothing while closed', () => {
    expect(element().querySelector('.palette')).toBeNull();
  });

  it('should open with Ctrl K, ⌘ K, or / and focus the search box', () => {
    press('k', { ctrlKey: true });
    expect(palette.isOpen()).toBe(true);
    expect(document.activeElement?.classList).toContain('query');

    press('k', { ctrlKey: true });
    expect(palette.isOpen()).toBe(false);

    press('K', { metaKey: true });
    expect(palette.isOpen()).toBe(true);
    palette.close();

    press('/');
    expect(palette.isOpen()).toBe(true);
  });

  it('should not hijack / while typing in a field', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));

    expect(palette.isOpen()).toBe(false);
    input.remove();
  });

  it('should list pinned, then recent, then all other tools', () => {
    favorites.toggle('loan-calculator');
    favorites.recordVisit('jwt-decoder');
    palette.open();
    fixture.detectChanges();

    expect(sectionLabels()).toEqual(['Pinned', 'Recent', 'All tools']);
    expect(titles().slice(0, 2)).toEqual(['Loan Calculator', 'JWT Decoder']);
    expect(titles().filter(t => t === 'Loan Calculator').length).toBe(1);
  });

  it('should skip empty sections', () => {
    palette.open();
    fixture.detectChanges();

    expect(sectionLabels()).toEqual(['All tools']);
  });

  it('should filter as you type and reset the highlight', () => {
    palette.open();
    fixture.detectChanges();
    pressInPalette('ArrowDown');

    component.onQuery('pdf');
    fixture.detectChanges();

    expect(sectionLabels()).toEqual(['Results']);
    expect(titles().every(t => t?.includes('PDF'))).toBe(true);
    expect(component.activeIndex()).toBe(0);
  });

  it('should show an empty message when nothing matches', () => {
    palette.open();
    fixture.detectChanges();
    component.onQuery('zzqx');
    fixture.detectChanges();

    expect(element().querySelector('.empty')?.textContent).toContain('zzqx');
  });

  it('should move the highlight with the arrow keys and wrap around', () => {
    palette.open();
    fixture.detectChanges();
    component.onQuery('pdf');
    fixture.detectChanges();
    const count = component.items().length;

    pressInPalette('ArrowUp');
    expect(component.activeIndex()).toBe(count - 1);

    pressInPalette('ArrowDown');
    expect(component.activeIndex()).toBe(0);
    expect(element().querySelector('[role="combobox"]')?.getAttribute('aria-activedescendant'))
      .toBe('palette-option-0');
  });

  it('should open the highlighted tool on Enter and close', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    palette.open();
    fixture.detectChanges();
    component.onQuery('jwt');
    fixture.detectChanges();

    pressInPalette('Enter');

    expect(navigate).toHaveBeenCalledWith(['/', 'jwt-decoder']);
    expect(palette.isOpen()).toBe(false);
  });

  it('should pin the highlighted tool on Shift Enter and stay open', () => {
    palette.open();
    fixture.detectChanges();
    component.onQuery('jwt');
    fixture.detectChanges();

    pressInPalette('Enter', { shiftKey: true });

    expect(favorites.isPinned('jwt-decoder')).toBe(true);
    expect(palette.isOpen()).toBe(true);
    expect(element().querySelector('.item.active .star')).toBeTruthy();
  });

  it('should close on Escape and on a backdrop click', () => {
    palette.open();
    fixture.detectChanges();
    pressInPalette('Escape');
    expect(palette.isOpen()).toBe(false);

    palette.open();
    fixture.detectChanges();
    (element().querySelector('.backdrop') as HTMLElement).click();
    expect(palette.isOpen()).toBe(false);
  });

  it('should highlight the first match when reopened', () => {
    palette.open();
    fixture.detectChanges();
    component.onQuery('loan');
    fixture.detectChanges();
    palette.close();

    palette.open();
    fixture.detectChanges();
    expect(component.query()).toBe('');
    expect(activeTitle()).toBe(titles()[0]);
  });
});
