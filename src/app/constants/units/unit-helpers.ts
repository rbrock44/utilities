export function linearUnit(id: string, label: string, aliases: string[], factor: number): UnitDefinition {
  return {
    id,
    label,
    aliases,
    toBase: (value: number) => value * factor,
    fromBase: (value: number) => value / factor,
  };
}

export function formatConvertedValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  return parseFloat(value.toFixed(6)).toString();
}

export function toComboBoxOptions(units: UnitDefinition[]): ComboBoxOption[] {
  return units.map(unit => ({
    id: unit.id,
    label: unit.label,
    searchText: [unit.label, ...unit.aliases].join(' ').toLowerCase(),
  }));
}
