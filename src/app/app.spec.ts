import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { of } from 'rxjs';
import { App } from './app';
import { RightAngleCalculatorComponent } from './components/calculators/right-angle-calculator/right-angle-calculator';

@Component({
  selector: 'app-right-angle-calculator',
  standalone: true,
  template: '<div data-testid="mock-right-angle">Mock Right Angle Calculator</div>'
})
class MockRightAngleCalculatorComponent {}

/**
 * App imports every widget in the site, so building it takes several seconds — long
 * enough to trip vitest's 10s default when a CI runner is compiling the other suites at
 * the same time.
 */
const SLOW_TEST_MS = 60_000;

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // Every widget in app.html sits behind `@defer (on immediate)`, and TestBed leaves
      // defer blocks in their placeholder unless it is told to play them through.
      deferBlockBehavior: DeferBlockBehavior.Playthrough,
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        }
      ]
    })
      .overrideComponent(App, {
        remove: {
          imports: [RightAngleCalculatorComponent]
        },
        add: {
          imports: [MockRightAngleCalculatorComponent]
        }
      })
      .compileComponents();
  }, SLOW_TEST_MS);

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  }, SLOW_TEST_MS);

  it('should render dashboard header', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Dashboard');
  }, SLOW_TEST_MS);

  it('should use the right-angle mock in app tests', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.settingsService.setSelectedTile('rac');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="mock-right-angle"]')).toBeTruthy();
  }, SLOW_TEST_MS);
});
