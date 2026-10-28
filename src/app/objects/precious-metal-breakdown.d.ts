interface PreciousMetalBreakdown {
  type: string;
  note?: string;
  /** Carats of stone taken off; the weights are the metal alone. */
  stoneCarats?: number;
  weightGrams: number;
  weightToz: number;
  pureWeightGrams: number;
  pureWeightToz: number;
  spotValue: number;
  value90: number;
  value80: number;
}