interface MetalRow {
  id: number;
  type: string;
  weight: number;
  unit: 'grams' | 'toz';
  note?: string;
  /** Percent fine, used only when `type` is the custom silver option. */
  purity?: number;
}