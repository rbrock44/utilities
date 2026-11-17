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
    const listed = [...el.querySelectorAll('app-tool-settings h2')].map(h => h.textContent?.trim());
    expect(listed).toEqual(component.settingsTools.map(tool => tool.title));

    const select = el.querySelector('[data-setting="rowUnit"]') as HTMLSelectElement;
    select.value = 'dwt';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(toggle.textContent).toContain('1 changed');
  });
});
