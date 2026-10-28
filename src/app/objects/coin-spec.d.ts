interface CoinSpec {
  name: string;
  weightGrams: number;
  purity: number; // decimal (e.g., 0.900 for 90% of metal (gold/silver))
  description?: string;
  /** Mint marks struck in this metal (`S` for a silver-only proof); left out when every mint was. */
  mints?: string[];
  /** Years struck, for coins whose description is a size (`1 toz`) rather than a date. */
  years?: { from?: number; to?: number };
}