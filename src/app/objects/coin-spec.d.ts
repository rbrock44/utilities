interface CoinSpec {
  name: string;
  weightGrams: number;
  purity: number; // decimal (e.g., 0.900 for 90% of metal (gold/silver))
  description?: string;
}