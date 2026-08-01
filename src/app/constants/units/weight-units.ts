import { linearUnit } from './unit-helpers';

export const WEIGHT_UNITS: UnitDefinition[] = [
  linearUnit('mg', 'Milligram (mg)', ['mg', 'milligram', 'milligrams'], 0.001),
  linearUnit('g', 'Gram (g)', ['g', 'gram', 'grams'], 1),
  linearUnit('kg', 'Kilogram (kg)', ['kg', 'kilogram', 'kilograms'], 1000),
  linearUnit('oz', 'Ounce (oz)', ['oz', 'ounce', 'ounces'], 28.3495),
  linearUnit('lb', 'Pound (lb)', ['lb', 'pound', 'pounds'], 453.592),
  linearUnit('st', 'Stone (st)', ['st', 'stone', 'stones'], 6350.29),
  linearUnit('t', 'Metric Ton (t)', ['t', 'ton', 'tonne', 'tonnes', 'metric ton'], 1000000),
];
