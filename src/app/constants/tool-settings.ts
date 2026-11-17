import { SettingDefinition } from '../services/tool-settings';
import { METAL_UNITS } from './constants';

export const PRECIOUS_METALS_SETTINGS: SettingDefinition[] = [
  {
    kind: 'select',
    key: 'rowUnit',
    label: 'Unit for new rows',
    hint: 'Blank rows switch over too.',
    default: 'grams',
    options: METAL_UNITS.map(unit => ({ value: unit.id, label: unit.label })),
  },
  {
    kind: 'numbers',
    key: 'breakdownColumns',
    label: 'Breakdown columns (% of spot)',
    hint: '100% shows as Spot.',
    default: [100, 90, 80],
    labels: ['First column', 'Second column', 'Third column'],
    min: 1,
    max: 200,
    suffix: '%',
  },
];

/** Mirrors the page sizes, orientations, and fit modes in the image-to-pdf widget. */
export const IMAGE_TO_PDF_SETTINGS: SettingDefinition[] = [
  {
    kind: 'select',
    key: 'pageSize',
    label: 'Page size',
    default: 'a4',
    options: [{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'legal', label: 'Legal' }],
  },
  {
    kind: 'select',
    key: 'orientation',
    label: 'Orientation',
    default: 'portrait',
    options: [{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }],
  },
  {
    kind: 'select',
    key: 'fitMode',
    label: 'Image fit',
    default: 'fit',
    options: [
      { value: 'fit', label: 'Fit (keep aspect ratio)' },
      { value: 'fill', label: 'Fill (crop to fill page)' },
      { value: 'stretch', label: 'Stretch (ignore aspect ratio)' },
    ],
  },
];

export const CUT_LIST_SETTINGS: SettingDefinition[] = [
  {
    kind: 'select',
    key: 'unit',
    label: 'Length unit',
    default: 'in',
    options: [{ value: 'in', label: 'Inches' }, { value: 'ft', label: 'Feet' }],
  },
  {
    kind: 'number',
    key: 'stockLength',
    label: 'Stock length',
    hint: 'In the length unit above, e.g. 96 in or 8 ft.',
    default: 96,
    min: 0.1,
    max: 10000,
  },
  { kind: 'number', key: 'kerf', label: 'Blade kerf', default: 0.125, min: 0, max: 1, suffix: 'in' },
  {
    kind: 'number',
    key: 'trimPerEnd',
    label: 'Trim per end',
    hint: 'In the length unit above.',
    default: 0,
    min: 0,
    max: 1000,
  },
];

/** The sheet options mirror SHEET_SIZES in the paint and drywall widget. */
export const PAINT_DRYWALL_SETTINGS: SettingDefinition[] = [
  { kind: 'number', key: 'coverage', label: 'Paint coverage', default: 350, min: 1, max: 2000, suffix: 'sq ft/gal' },
  { kind: 'number', key: 'coats', label: 'Coats', default: 2, min: 1, max: 10, integer: true },
  {
    kind: 'select',
    key: 'sheetSqft',
    label: 'Drywall sheet',
    default: '32',
    options: [{ value: '32', label: '4′ × 8′' }, { value: '40', label: '4′ × 10′' }, { value: '48', label: '4′ × 12′' }],
  },
  { kind: 'number', key: 'wastePercent', label: 'Drywall waste', default: 10, min: 0, max: 100, suffix: '%' },
];

/** The options mirror PRECISIONS in the inch fraction widget. */
export const INCH_FRACTION_SETTINGS: SettingDefinition[] = [
  {
    kind: 'select',
    key: 'precision',
    label: 'Round to',
    default: '16',
    options: [8, 16, 32, 64].map(n => ({ value: String(n), label: `1/${n}″` })),
  },
];
