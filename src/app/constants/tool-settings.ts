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
