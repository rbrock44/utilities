import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightAngleCalculatorComponent } from './right-angle-calculator';

type TriangleInputs = Pick<RightAngleCalculatorComponent, 'sideA' | 'sideB' | 'sideC' | 'angleA' | 'angleB'>;

describe('RightAngleCalculatorComponent', () => {
  let component: RightAngleCalculatorComponent;
  let fixture: ComponentFixture<RightAngleCalculatorComponent>;

  const solve = (values: Partial<TriangleInputs>) => {
    Object.assign(component, { sideA: 0, sideB: 0, sideC: 0, angleA: 0, angleB: 0 }, values);
    component.calculate();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RightAngleCalculatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RightAngleCalculatorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should solve the hypotenuse and angles from both legs', () => {
    solve({ sideA: 3, sideB: 4 });

    expect(component.errorMessage).toBeNull();
    expect(component.sideC).toBeCloseTo(5);
    expect(component.angleA).toBeCloseTo(36.8699, 3);
    expect(component.angleB).toBeCloseTo(53.1301, 3);
    expect(['c', 'A', 'B'].every(f => component.isSolved(f))).toBe(true);
    expect(component.isSolved('a')).toBe(false);
  });

  it('should solve a missing leg from the hypotenuse', () => {
    solve({ sideB: 4, sideC: 5 });
    expect(component.sideA).toBeCloseTo(3);

    solve({ sideA: 3, sideC: 5 });
    expect(component.sideB).toBeCloseTo(4);
  });

  it('should reject a hypotenuse that is not the longest side', () => {
    solve({ sideA: 5, sideC: 4 });

    expect(component.solution).toBeNull();
    expect(component.errorMessage).toContain('Hypotenuse c must be greater than side a');
  });

  it('should solve from one side and one angle', () => {
    solve({ sideC: 10, angleA: 30 });

    expect(component.sideA).toBeCloseTo(5);
    expect(component.sideB).toBeCloseTo(8.6603, 3);
    expect(component.angleB).toBeCloseTo(60);
    expect(component.isSolved('B')).toBe(true);
  });

  it('should derive angle A when only angle B is given', () => {
    solve({ sideA: 1, angleB: 45 });

    expect(component.angleA).toBeCloseTo(45);
    expect(component.sideB).toBeCloseTo(1);
    expect(component.sideC).toBeCloseTo(Math.SQRT2);
    expect(component.isSolved('A')).toBe(true);
  });

  it('should reject angles of 90° or more', () => {
    solve({ sideA: 1, angleA: 90 });
    expect(component.errorMessage).toContain('less than 90°');
  });

  it('should reject two angles that do not sum to 90°', () => {
    solve({ sideA: 1, angleA: 30, angleB: 50 });
    expect(component.errorMessage).toContain('sum to 90°');
  });

  it('should reject negative values', () => {
    solve({ sideA: -1, sideB: 2 });
    expect(component.errorMessage).toContain('Side values');
  });

  it('should ask for exactly two known values', () => {
    solve({ sideA: 3 });
    expect(component.errorMessage).toContain('Enter exactly two sides');

    solve({ sideA: 3, sideB: 4, sideC: 5 });
    expect(component.errorMessage).toContain('Enter exactly two sides');
  });

  it('should clear the previous solution when an input changes', () => {
    solve({ sideA: 3, sideB: 4 });
    component.onInputChange();

    expect(component.solution).toBeNull();
    expect(component.isSolved('c')).toBe(false);
  });
});
