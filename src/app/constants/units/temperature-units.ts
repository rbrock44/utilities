export const TEMPERATURE_UNITS: UnitDefinition[] = [
  {
    id: 'c',
    label: 'Celsius (°C)',
    aliases: ['c', 'celsius', 'centigrade'],
    toBase: value => value,
    fromBase: value => value,
  },
  {
    id: 'f',
    label: 'Fahrenheit (°F)',
    aliases: ['f', 'fahrenheit'],
    toBase: value => (value - 32) * 5 / 9,
    fromBase: value => value * 9 / 5 + 32,
  },
  {
    id: 'k',
    label: 'Kelvin (K)',
    aliases: ['k', 'kelvin'],
    toBase: value => value - 273.15,
    fromBase: value => value + 273.15,
  },
];
