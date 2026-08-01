import { linearUnit } from './unit-helpers';

export const LENGTH_UNITS: UnitDefinition[] = [
  linearUnit('mm', 'Millimeter (mm)', ['mm', 'millimeter', 'millimeters', 'millimetre'], 0.001),
  linearUnit('cm', 'Centimeter (cm)', ['cm', 'centimeter', 'centimeters', 'centimetre'], 0.01),
  linearUnit('m', 'Meter (m)', ['m', 'meter', 'meters', 'metre'], 1),
  linearUnit('km', 'Kilometer (km)', ['km', 'kilometer', 'kilometers', 'kilometre'], 1000),
  linearUnit('in', 'Inch (in)', ['in', 'inch', 'inches'], 0.0254),
  linearUnit('ft', 'Foot (ft)', ['ft', 'foot', 'feet'], 0.3048),
  linearUnit('yd', 'Yard (yd)', ['yd', 'yard', 'yards'], 0.9144),
  linearUnit('mi', 'Mile (mi)', ['mi', 'mile', 'miles'], 1609.344),
];
