import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnitConverterComponent } from './unit-converter';
import { LENGTH_UNITS } from '../../../constants/units/length-units';
import { TEMPERATURE_UNITS } from '../../../constants/units/temperature-units';

describe('UnitConverterComponent', () => {
  let component: UnitConverterComponent;
  let fixture: ComponentFixture<UnitConverterComponent>;

  const useUnits = (units: UnitDefinition[]) => {
    component.units = units;
    component.ngOnChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitConverterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnitConverterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to the first two units and convert 1 of the first', () => {
    useUnits(LENGTH_UNITS);

    expect(component.fromId).toBe('mm');
    expect(component.toId).toBe('cm');
    expect(component.toValue).toBe('0.1');
  });

  it('should convert feet to inches', () => {
    useUnits(LENGTH_UNITS);
    component.onFromUnitChange('ft');
    component.onToUnitChange('in');
    component.fromValue = '3';
    component.onFromValueChange();

    expect(component.toValue).toBe('36');
  });

  it('should convert backwards when the target value is edited', () => {
    useUnits(LENGTH_UNITS);
    component.onFromUnitChange('ft');
    component.onToUnitChange('in');
    component.toValue = '18';
    component.onToValueChange();

    expect(component.fromValue).toBe('1.5');
  });

  it('should handle offset scales like temperature', () => {
    useUnits(TEMPERATURE_UNITS);
    component.onFromUnitChange('c');
    component.onToUnitChange('f');
    component.fromValue = '100';
    component.onFromValueChange();
    expect(component.toValue).toBe('212');

    component.onToUnitChange('k');
    expect(component.toValue).toBe('373.15');
  });

  it('should swap units and recalculate', () => {
    useUnits(LENGTH_UNITS);
    component.onFromUnitChange('m');
    component.onToUnitChange('cm');
    component.swap();

    expect(component.fromId).toBe('cm');
    expect(component.toId).toBe('m');
    expect(component.toValue).toBe('0.01');
  });

  it('should clear the result for non-numeric input', () => {
    useUnits(LENGTH_UNITS);
    component.fromValue = 'abc';
    component.onFromValueChange();

    expect(component.toValue).toBe('');
    expect(component.allConversions).toEqual([]);
  });

  it('should list every other unit in allConversions', () => {
    useUnits(LENGTH_UNITS);
    component.onFromUnitChange('km');

    const conversions = component.allConversions;
    expect(conversions.length).toBe(LENGTH_UNITS.length - 1);
    expect(conversions.find(c => c.label === 'Meter (m)')?.value).toBe('1000');
  });

  it('should keep a still-valid selection when units change', () => {
    useUnits(LENGTH_UNITS);
    component.onFromUnitChange('mi');
    useUnits([...LENGTH_UNITS]);

    expect(component.fromId).toBe('mi');
  });

  it('should reset everything when given no units', () => {
    useUnits(LENGTH_UNITS);
    useUnits([]);

    expect(component.fromId).toBe('');
    expect(component.toId).toBe('');
    expect(component.toValue).toBe('');
  });
});
