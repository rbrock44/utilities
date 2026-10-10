import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DividerSpacingCalculatorComponent } from './divider-spacing-calculator';

describe('DividerSpacingCalculatorComponent', () => {
  let component: DividerSpacingCalculatorComponent;
  let fixture: ComponentFixture<DividerSpacingCalculatorComponent>;

  const enter = (overallWidth: number, materialWidth: number, dividerCount: number, includeEnds = true) => {
    Object.assign(component, { overallWidth, materialWidth, dividerCount, includeEnds });
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DividerSpacingCalculatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DividerSpacingCalculatorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show nothing until every input is filled', () => {
    component.overallWidth = 30;
    expect(component.hasRequiredInputs).toBe(false);
    expect(component.errorMessage).toBeNull();
    expect(component.spacingResult).toBeNull();
  });

  it('should space dividers flush to both ends when ends are included', () => {
    enter(30, 2, 4);

    const result = component.spacingResult!;
    expect(result.clearGap).toBeCloseTo(22 / 3);
    expect(result.placements[0].start).toBe(0);
    expect(result.placements[3].end).toBeCloseTo(30);
  });

  it('should leave equal gaps at both ends when ends are excluded', () => {
    enter(30, 2, 4, false);

    const result = component.spacingResult!;
    expect(result.clearGap).toBeCloseTo(22 / 5);
    expect(result.placements[0].start).toBeCloseTo(4.4);
    expect(30 - result.placements[3].end).toBeCloseTo(4.4);
  });

  it('should report start, center, and end for each divider', () => {
    enter(10, 1, 2, false);

    const [first] = component.spacingResult!.placements;
    expect(first.index).toBe(1);
    expect(first.start).toBeCloseTo(8 / 3);
    expect(first.center).toBeCloseTo(8 / 3 + 0.5);
    expect(first.end).toBeCloseTo(8 / 3 + 1);
  });

  it('should allow dividers that exactly fill the width', () => {
    enter(8, 2, 4);

    expect(component.errorMessage).toBeNull();
    expect(component.spacingResult!.clearGap).toBe(0);
  });

  it('should reject material wider than the overall width', () => {
    enter(5, 2, 3);
    expect(component.errorMessage).toContain('larger than the overall width');
    expect(component.spacingResult).toBeNull();
  });

  it('should validate each input', () => {
    enter(0, 2, 3);
    expect(component.errorMessage).toContain('Overall width');

    enter(10, 0, 3);
    expect(component.errorMessage).toContain('Material width');

    enter(10, 1, 0);
    expect(component.errorMessage).toContain('at least 1');

    enter(10, 1, 2.5);
    expect(component.errorMessage).toContain('whole number');
  });

  it('should format measurement labels to two decimals', () => {
    enter(30, 2, 4);
    expect(component.gapMeasurementLabel).toBe('7.33');
    expect(component.formatNumber(1234.5)).toBe('1,234.5');
  });
});
