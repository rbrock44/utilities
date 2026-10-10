import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { Location } from '@angular/common';
import { App } from './app';
import { routes } from './app.routes';
import { SeoTitleStrategy } from './services/seo';

/** Tool pages lazy-load real widgets, which can be slow when CI compiles suites in parallel. */
const SLOW_TEST_MS = 60_000;

describe('App', () => {
  let router: Router;
  let location: Location;
  let document: Document;

  async function render(url: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App);
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  /** afterNextRender kicks off the widget import, which resolves on its own schedule. */
  async function waitFor(page: HTMLElement, selector: string): Promise<Element | null> {
    for (let i = 0; i < 100 && !page.querySelector(selector); i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    return page.querySelector(selector);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideLocationMocks(),
        { provide: TitleStrategy, useClass: SeoTitleStrategy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    document = TestBed.inject(DOCUMENT);
  }, SLOW_TEST_MS);

  it('should render the dashboard header and tile grid on the home page', async () => {
    const page = await render('/');
    expect(page.querySelector('.logo')?.textContent).toContain('Dashboard');
    expect(page.querySelectorAll('h1').length).toBe(1);
    expect(page.querySelector('app-tile-grid')).toBeTruthy();
  }, SLOW_TEST_MS);

  it('should load a tool on its own route', async () => {
    const page = await render('/right-angle-calculator');
    expect(page.querySelector('app-tile-grid')).toBeNull();
    expect(page.querySelector('app-back-button')).toBeTruthy();
    expect(page.querySelector('h1')?.textContent).toBe('Right Angle Calculator');
    expect(await waitFor(page, 'app-right-angle-calculator')).toBeTruthy();
  }, SLOW_TEST_MS);

  it('should link related tools from the tool page', async () => {
    const page = await render('/jwt-decoder');
    const links = Array.from(page.querySelectorAll('aside.related a')).map(a => a.getAttribute('href'));
    expect(links).toEqual(['/base64-converter', '/json-formatter', '/timestamp-converter', '/cron-translator']);
  }, SLOW_TEST_MS);

  it('should pass route inputs through to a shared widget', async () => {
    const page = await render('/volume-converter');
    expect((await waitFor(page, 'app-unit-converter'))?.textContent).toContain('teaspoons');
  }, SLOW_TEST_MS);

  it('should redirect a legacy short-alias link to the tool route', async () => {
    await render('/?tile=rac');
    expect(location.path()).toBe('/right-angle-calculator');
  }, SLOW_TEST_MS);

  it('should redirect a legacy full-param link to the tool route', async () => {
    await render('/?tile=jwt-decoder');
    expect(location.path()).toBe('/jwt-decoder');
  }, SLOW_TEST_MS);

  it('should stay home for an unknown legacy tile', async () => {
    const page = await render('/?tile=nope');
    expect(page.querySelector('app-tile-grid')).toBeTruthy();
  }, SLOW_TEST_MS);

  it('should send unknown paths home', async () => {
    await render('/not-a-tool');
    expect(location.path()).toBe('/');
  }, SLOW_TEST_MS);

  it('should set per-tool title, description, and robots tags', async () => {
    await render('/jwt-decoder');
    expect(document.title).toBe('JWT Decoder – Utilities');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBeTruthy();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow');
  }, SLOW_TEST_MS);

  it('should mark unlisted tools noindex', async () => {
    await render('/cleaning-payout-calculator');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
  }, SLOW_TEST_MS);
});
