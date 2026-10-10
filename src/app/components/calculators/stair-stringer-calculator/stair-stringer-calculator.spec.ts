import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StairStringerCalculatorComponent } from './stair-stringer-calculator';

describe('StairStringerCalculatorComponent', () => {
  let component: StairStringerCalculatorComponent;
  let fixture: ComponentFixture<StairStringerCalculatorComponent>;

  const enter = (totalRise: number | null, targetRiser = 7.5, treadDepth = 10, treadThickness: number | null = 1) => {
    Object.assign(component, { totalRise, targetRiser, treadDepth, treadThickness });
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StairStringerCalculatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StairStringerCalculatorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should start with common defaults and no result until a rise is entered', () => {
    expect(component.targetRiser).toBe(7.5);
    expect(component.treadDepth).toBe(10);
    expect(component.treadThickness).toBe(1);
    expect(component.errorMessage).toBeNull();
    expect(component.layout).toBeNull();
    expect(component.codeChecks).toEqual([]);
  });

  it('should lay out a 108 inch rise', () => {
    enter(108);
    const layout = component.layout!;

    expect(layout.risers).toBe(14);
    expect(layout.riserHeight).toBeCloseTo(7.7143, 4);
    expect(layout.treads).toBe(13);
    expect(layout.totalRun).toBe(130);
    expect(layout.stringerLength).toBeCloseTo(169.009, 3);
    expect(layout.angle).toBeCloseTo(37.65, 1);
    expect(layout.bottomRiserCut).toBeCloseTo(6.7143, 4);
    expect(layout.boardLengthFt).toBe(16);
  });

  it('should format the 108 inch layout to tape-measure fractions', () => {
    enter(108);
    const layout = component.layout!;

    expect(component.formatInches(layout.riserHeight)).toBe('7 11/16″');
    expect(component.formatInches(layout.bottomRiserCut)).toBe('6 11/16″');
    expect(component.formatFeet(layout.stringerLength)).toBe('14′ 1″');
    expect(component.formatFeet(layout.totalRun)).toBe('10′ 10″');
  });

  it('should add a riser when the closest count would exceed the code maximum', () => {
    // 47 / 7.75 rounds to 6 risers, but 47 / 6 = 7.83 is over 7.75.
    enter(47, 7.75);

    expect(component.layout!.risers).toBe(7);
    expect(component.layout!.riserHeight).toBeCloseTo(6.7143, 4);
  });

  it('should pass the code checks for a typical stair and flag a steep step', () => {
    enter(108);
    const checks = component.codeChecks;

    expect(checks[0].pass).toBe(true);
    expect(checks[1].pass).toBe(true);
    // 2 × 7.71 + 10 = 25.43, just over the comfortable range.
    expect(checks[2].pass).toBe(false);
  });

  it('should fail the tread check below 10 inches', () => {
    enter(108, 7.5, 9);
    expect(component.codeChecks[1].pass).toBe(false);
  });

  it('should report a comfortable step when 2R + T lands in range', () => {
    // 105 / 15 risers = 7 exactly; 2 × 7 + 10.5 = 24.5.
    enter(105, 7, 10.5);
    expect(component.layout!.riserHeight).toBe(7);
    expect(component.codeChecks.every(check => check.pass)).toBe(true);
  });

  it('should not suggest a board over 20 feet', () => {
    enter(200, 7.5, 11);
    expect(component.layout!.boardLengthFt).toBeNull();
  });

  it('should treat a blank tread thickness as zero', () => {
    enter(108, 7.5, 10, null);
    expect(component.layout!.bottomRiserCut).toBeCloseTo(component.layout!.riserHeight);
  });

  it('should validate each input', () => {
    enter(0);
    expect(component.errorMessage).toBe('Total rise must be greater than 0.');

    enter(108, 0);
    expect(component.errorMessage).toBe('Target riser height must be greater than 0.');

    enter(108, 7.5, -10);
    expect(component.errorMessage).toBe('Tread depth must be greater than 0.');

    enter(108, 7.5, 10, -1);
    expect(component.errorMessage).toBe('Tread thickness can\'t be negative.');

    enter(108, 7.5, 10, 8);
    expect(component.errorMessage).toBe('Tread thickness must be less than the riser height.');
    expect(component.layout).toBeNull();
  });

  it('should reduce fractions and handle whole and sub-inch values', () => {
    expect(component.formatInches(7.75)).toBe('7 3/4″');
    expect(component.formatInches(10)).toBe('10″');
    expect(component.formatInches(0.5)).toBe('1/2″');
    expect(component.formatInches(0.03)).toBe('0″');
    expect(component.formatInches(2.99)).toBe('3″');
  });

  it('should carry rounded inches into the next foot', () => {
    expect(component.formatFeet(143.99)).toBe('12′ 0″');
  });
});
