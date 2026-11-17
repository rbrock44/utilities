import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TileGridComponent } from './tile-grid';

describe('TileGridComponent', () => {
  let component: TileGridComponent;
  let fixture: ComponentFixture<TileGridComponent>;

  beforeEach(async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    await TestBed.configureTestingModule({
      imports: [TileGridComponent],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TileGridComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should list every tool with settings and count what is changed', () => {
    const el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    const toggle = el.querySelector('.settings-toggle') as HTMLButtonElement;
    expect(toggle.textContent).not.toContain('changed');

    toggle.click();
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')).toBeTruthy();
    const listed = [...el.querySelectorAll('app-tool-settings h3')].map(h => h.textContent?.trim());
    expect(listed).toEqual(component.settingsTools.map(tool => tool.title));

    const select = el.querySelector('[data-setting="rowUnit"]') as HTMLSelectElement;
    select.value = 'dwt';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(toggle.textContent).toContain('1 changed');
  });
});

describe('TileGridComponent settings search', () => {
  let fixture: ComponentFixture<TileGridComponent>;

  const el = () => fixture.nativeElement as HTMLElement;
  const headings = () => [...el().querySelectorAll('app-tool-settings h3')].map(h => h.textContent?.trim());
  const search = (text: string) => {
    const box = el().querySelector('.settings-search') as HTMLInputElement;
    box.value = text;
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    await TestBed.configureTestingModule({ imports: [TileGridComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(TileGridComponent);
    fixture.detectChanges();
    (el().querySelector('.settings-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should narrow to matching settings, every word counting', () => {
    search('kerf');
    expect(headings()).toEqual(['Cut List Optimizer']);
    expect(el().querySelectorAll('app-tool-settings .field').length).toBe(1);

    search('cut unit');
    expect(el().querySelector('[data-setting="unit"]')).toBeTruthy();
    expect(el().querySelector('[data-setting="kerf"]')).toBeNull();
  });

  it('should match a tool name, an option name, and say when nothing matches', () => {
    search('precious');
    expect(headings()).toEqual(['Precious Metals']);

    search('letter');
    expect(headings()).toEqual(['Image to PDF']);

    search('zzz');
    expect(headings()).toEqual([]);
    expect(el().querySelector('.settings-empty')?.textContent).toContain('zzz');
  });

  it('should start with an empty search each time it opens', () => {
    search('kerf');
    fixture.componentInstance.settingsOpen.set(false);
    fixture.detectChanges();
    (el().querySelector('.settings-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(headings().length).toBe(fixture.componentInstance.settingsTools.length);
  });
});
