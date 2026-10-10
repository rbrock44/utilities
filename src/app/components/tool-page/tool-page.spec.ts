import { ChangeDetectorRef, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { ToolPageComponent } from './tool-page';

@Component({ selector: 'app-fake-widget', standalone: true, template: '<p class="fake">widget</p>' })
class FakeWidgetComponent {}

describe('ToolPageComponent', () => {
  let fixture: ComponentFixture<ToolPageComponent>;
  let session: Record<string, string>;
  let reload: ReturnType<typeof vi.fn<() => void>>;

  const setup = async (load: () => Promise<unknown>) => {
    await TestBed.configureTestingModule({
      imports: [ToolPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { routeConfig: { path: 'jwt-decoder' }, data: { description: '', heading: 'JWT Decoder', tool: { load } } } },
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
});
