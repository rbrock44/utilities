interface CoinSpec {
  name: string;
  weightGrams: number;
  silverPurity: number; // decimal (e.g., 0.900 for 90% silver)
  description?: string;
}