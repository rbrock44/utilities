type MetalUnitId = 'grams' | 'mg' | 'kg' | 'toz' | 'lbt' | 'dwt' | 'grain' | 'oz' | 'lb' | 'tola';

interface MetalUnit {
  id: MetalUnitId;
  /** Short name shown in the unit dropdown. */
  label: string;
  grams: number;
  /** Compact id used in share links. */
  code: string;
}
