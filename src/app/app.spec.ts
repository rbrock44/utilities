import { TestBed } from '@angular/core/testing';
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

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
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
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render dashboard header', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Dashboard');
  });

  it('should use the right-angle mock in app tests', () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.settingsService.setSelectedTile('rac');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="mock-right-angle"]')).toBeTruthy();
  });
});
