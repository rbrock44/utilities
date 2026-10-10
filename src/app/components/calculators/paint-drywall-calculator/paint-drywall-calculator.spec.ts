import { ComponentFixture, TestBed } from '@angular/core/testing';

import { paintAmount, PaintDrywallCalculatorComponent } from './paint-drywall-calculator';

describe('paintAmount', () => {
  it('should round up to whole quarts', () => {
    // 301 sq ft × 2 coats / 350 = 1.72 gal = 6.88 qt, so buy 7 quarts.
    expect(paintAmount(301, 2, 350)).toEqual({ gallons: 602 / 350, buyLabel: '1 gal + 3 qt' });
  });

  it('should not round an exact gallon up', () => {
    expect(paintAmount(350, 1, 350).buyLabel).toBe('1 gal');
  });

  it('should show quarts alone for small jobs and None for no area', () => {
    expect(paintAmount(120, 2, 350).buyLabel).toBe('3 qt');
    expect(paintAmount(0, 2, 350).buyLabel).toBe('None');
  });
});

describe('PaintDrywallCalculatorComponent', () => {
  let component: PaintDrywallCalculatorComponent;
  let fixture: ComponentFixture<PaintDrywallCalculatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaintDrywallCalculatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaintDrywallCalculatorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should work out the default 12 × 10 × 8 room', () => {
    const result = component.result!;

    expect(result.wallArea).toBe(352);
    expect(result.openingsArea).toBe(51);
    expect(result.ceilingArea).toBe(120);
    expect(result.walls.buyLabel).toBe('1 gal + 3 qt');
    expect(result.ceiling!.buyLabel).toBe('3 qt');
    // (301 + 120) × 1.10 = 463.1 sq ft / 32 = 14.47, so 15 sheets.
    expect(result.drywallArea).toBe(421);
    expect(result.sheets).toBe(15);
  });

  it('should leave the ceiling out of paint and drywall when unchecked', () => {
    component.includeCeiling = false;
    const result = component.result!;

    expect(result.ceiling).toBeNull();
    expect(result.ceilingArea).toBe(0);
    // 301 × 1.10 = 331.1 / 32 = 10.35, so 11 sheets.
    expect(result.sheets).toBe(11);
  });

  it('should need fewer of the larger sheets', () => {
    component.sheetSqft = 48;
    // 463.1 / 48 = 9.65, so 10 sheets.
    expect(component.result!.sheets).toBe(10);
  });

  it('should round sheets up only past a whole sheet', () => {
    Object.assign(component, { length: 8, width: 8, height: 8, doors: 0, windows: 0, includeCeiling: false, wastePercent: 0 });
    // 256 sq ft / 32 = exactly 8 sheets.
    expect(component.result!.sheets).toBe(8);
  });

  it('should validate each input', () => {
    component.height = 0;
    expect(component.errorMessage).toBe('Room length, width, and height must all be greater than 0.');
    expect(component.result).toBeNull();
    component.height = 8;

    component.doors = 1.5;
    expect(component.errorMessage).toBe('Doors and windows must be whole numbers, 0 or more.');
    component.doors = 1;

    component.windows = null;
    expect(component.errorMessage).toBe('Doors and windows must be whole numbers, 0 or more.');
    component.windows = 2;

    component.coats = 0;
    expect(component.errorMessage).toBe('Coats must be a whole number, 1 or more.');
    component.coats = 2;

    component.coverage = 0;
    expect(component.errorMessage).toBe('Coverage per gallon must be greater than 0.');
    component.coverage = 350;

    component.wastePercent = -5;
    expect(component.errorMessage).toBe('Waste must be 0% or more.');
  });

  it('should reject more doors and windows than wall', () => {
    Object.assign(component, { length: 2, width: 2, height: 2, doors: 2, windows: 0 });
    expect(component.errorMessage).toBe('The doors and windows cover more than the walls.');
  });

  it('should format areas as whole square feet', () => {
    expect(component.formatArea(1234.4)).toBe('1,234 sq ft');
  });
});
