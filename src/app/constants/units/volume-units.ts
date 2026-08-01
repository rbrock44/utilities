import { linearUnit } from './unit-helpers';

export const VOLUME_UNITS: UnitDefinition[] = [
  linearUnit('ml', 'Milliliter (mL)', ['ml', 'milliliter', 'milliliters', 'millilitre'], 1),
  linearUnit('l', 'Liter (L)', ['l', 'liter', 'liters', 'litre'], 1000),
  linearUnit('tsp', 'Teaspoon (tsp)', ['tsp', 'teaspoon', 'teaspoons'], 4.92892),
  linearUnit('tbsp', 'Tablespoon (tbsp)', ['tbsp', 'tablespoon', 'tablespoons'], 14.7868),
  linearUnit('floz', 'Fluid Ounce (fl oz)', ['floz', 'fl oz', 'fluid ounce', 'fluid ounces'], 29.5735),
  linearUnit('cup', 'Cup (cup)', ['cup', 'cups'], 236.588),
  linearUnit('pt', 'Pint (pt)', ['pt', 'pint', 'pints'], 473.176),
  linearUnit('qt', 'Quart (qt)', ['qt', 'quart', 'quarts'], 946.353),
  linearUnit('gal', 'Gallon (gal)', ['gal', 'gallon', 'gallons'], 3785.41),
];
