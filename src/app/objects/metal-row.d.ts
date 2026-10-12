interface MetalRow {
  id: number;
  type: string;
  weight: number;
  unit: 'grams' | 'toz';
  note?: string;
  /** Percent fine, used only when `type` is the custom percent option. */
  purity?: number;
  /** Shown in place of the type name, e.g. a coin and how many of it. */
  label?: string;
}