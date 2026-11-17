import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { ToolPageComponent } from './tool-page';

@Component({ selector: 'app-fake-widget', standalone: true, template: '<p class="fake">widget</p>' })
class FakeWidgetComponent {}

@Component({ selector: 'app-fake-settings-widget', standalone: true, template: '<p class="fake">{{ settings?.unit }}</p>' })
class FakeSettingsWidgetComponent {
  @Input() settings?: { unit?: string };
}

describe('ToolPageComponent', () => {
  let fixture: ComponentFixture<ToolPageComponent>;
  let session: Record<string, string>;
  let reload: ReturnType<typeof vi.fn<() => void>>;

  const setup = async (load: () => Promise<unknown>, settings?: unknown[]) => {
    await TestBed.configureTestingModule({
      imports: [ToolPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { routeConfig: { path: 'jwt-decoder' }, data: { description: '', heading: 'JWT Decoder', tool: { load, settings } } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    // Let the rejected import settle, then re-render the OnPush view.
    await new Promise(resolve => setTimeout(resolve));
    fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };

  const page = () => fixture.nativeElement as HTMLElement;
  const chunkError = () => Promise.reject(new TypeError('Failed to fetch dynamically imported module'));

  beforeEach(() => {
    session = {};
    reload = vi.fn<() => void>();
    vi.spyOn(ToolPageComponent.prototype as unknown as { reloadPage: () => void }, 'reloadPage').mockImplementation(reload);
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => session[key] ?? null,
      setItem: (key: string, value: string) => { session[key] = value; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should render the widget once it loads', async () => {
    await setup(() => Promise.resolve(FakeWidgetComponent));

    expect(page().querySelector('.fake')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it('should reload once when the widget code is missing after a deploy', async () => {
    await setup(chunkError);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(Number(session['utilities-chunk-reload'])).toBeGreaterThan(0);
    expect(page().querySelector('[role="alert"]')).toBeNull();
  });

  it('should show an error instead of reloading again right after a reload', async () => {
    session['utilities-chunk-reload'] = String(Date.now() - 5_000);
    await setup(chunkError);

    expect(reload).not.toHaveBeenCalled();
    expect(page().querySelector('[role="alert"]')?.textContent).toContain('couldn\'t load');
  });

  it('should reload again once the last reload is long past', async () => {
    session['utilities-chunk-reload'] = String(Date.now() - 60_000);
    await setup(chunkError);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('should not risk a reload loop when session storage is blocked', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    await setup(chunkError);

    expect(reload).not.toHaveBeenCalled();
    expect(page().querySelector('[role="alert"]')).toBeTruthy();
  });

  it('should reload from the Try again button', async () => {
    session['utilities-chunk-reload'] = String(Date.now());
    await setup(chunkError);

    (page().querySelector('.retry') as HTMLButtonElement).click();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('should have no settings button for a tool without settings', async () => {
    await setup(() => Promise.resolve(FakeWidgetComponent));
    expect(page().querySelector('.settings-toggle')).toBeNull();
  });

  it('should open settings and pass a change straight to the widget', async () => {
    await setup(() => Promise.resolve(FakeSettingsWidgetComponent), [
      { kind: 'select', key: 'unit', label: 'Unit', default: 'g', options: [{ value: 'g', label: 'g' }, { value: 'dwt', label: 'dwt' }] },
    ]);
    const render = () => { fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck(); fixture.detectChanges(); };
    const toggle = page().querySelector('.settings-toggle') as HTMLButtonElement;
    expect(page().querySelector('.fake')?.textContent).toBe('g');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    render();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const select = page().querySelector('app-tool-settings select') as HTMLSelectElement;
    select.value = 'dwt';
    select.dispatchEvent(new Event('change'));
    render();
    expect(page().querySelector('.fake')?.textContent).toBe('dwt');

    (page().querySelector('app-settings-drawer .close') as HTMLButtonElement).click();
    render();
    expect(page().querySelector('app-tool-settings')).toBeNull();
  });
});
