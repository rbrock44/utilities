import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecificGravityCalculatorComponent } from './specific-gravity-calculator';

describe('SpecificGravityCalculatorComponent', () => {
  let component: SpecificGravityCalculatorComponent;
  let fixture: ComponentFixture<SpecificGravityCalculatorComponent>;

  const names = () => component.matches.map(m => m.name);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpecificGravityCalculatorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SpecificGravityCalculatorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should start in weight-in-water mode with no result or error', () => {
    expect(component.mode).toBe('in-water');
    expect(component.hasInputs).toBe(false);
    expect(component.sg).toBeNull();
    expect(component.errorMessage).toBeNull();
    expect(component.matches).toEqual([]);
    expect(component.closest).toBeNull();
  });

  it('should show nothing until both weights are entered', () => {
    component.dryWeight = 31.1;
    expect(component.hasInputs).toBe(false);
    expect(component.sg).toBeNull();
  });

  it('should compute SG from dry weight and weight in water', () => {
    component.dryWeight = 31.1;
    component.secondWeight = 29.49;

    expect(component.sg).toBeCloseTo(31.1 / 1.61);
    expect(names()).toEqual(['Gold 24k (.999)', 'Tungsten']);
    expect(component.hasNonPreciousMatch).toBe(true);
  });

  it('should compute SG from water displaced', () => {
    component.setMode('displaced');
    component.dryWeight = 10.5;
    component.secondWeight = 1;

    expect(component.sg).toBeCloseTo(10.5);
    expect(names()).toEqual(['Fine silver (.999)']);
    expect(component.hasNonPreciousMatch).toBe(false);
  });

  it('should match an SG entered directly', () => {
    component.setMode('direct');
    component.sgInput = 13.1;

    expect(component.sg).toBe(13.1);
    expect(names()).toEqual(['Gold 14k (.585)']);
  });

  it('should report the closest metal when nothing matches', () => {
    component.setMode('direct');
    component.sgInput = 5;

    expect(component.matches).toEqual([]);
    expect(component.closest?.name).toBe('Zinc');
  });

  it('should reject a zero dry weight', () => {
    component.dryWeight = 0;
    component.secondWeight = 0;
    expect(component.errorMessage).toBe('Dry weight must be greater than 0.');
    expect(component.sg).toBeNull();
  });

  it('should reject a weight in water at or above the dry weight', () => {
    component.dryWeight = 10;
    component.secondWeight = 10;
    expect(component.errorMessage).toBe('Weight in water must be less than the dry weight.');
    expect(component.sg).toBeNull();
  });

  it('should reject a negative weight in water', () => {
    component.dryWeight = 10;
    component.secondWeight = -1;
    expect(component.errorMessage).toBe('Weight in water cannot be negative.');
  });

  it('should reject zero water displaced', () => {
    component.setMode('displaced');
    component.dryWeight = 10;
    component.secondWeight = 0;
    expect(component.errorMessage).toBe('Water displaced must be greater than 0.');
  });

  it('should reject a non-positive SG', () => {
    component.setMode('direct');
    component.sgInput = 0;
    expect(component.errorMessage).toBe('Specific gravity must be greater than 0.');
    component.sgInput = -3;
    expect(component.errorMessage).toBe('Specific gravity must be greater than 0.');
  });

  it('should clear every input', () => {
    component.dryWeight = 31.1;
    component.secondWeight = 29.49;
    component.sgInput = 19.3;
    component.clear();

    expect(component.dryWeight).toBeNull();
    expect(component.secondWeight).toBeNull();
    expect(component.sgInput).toBeNull();
    expect(component.sg).toBeNull();
  });
});
