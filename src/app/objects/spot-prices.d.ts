interface SpotPrices {
  gold: number;  // Price per troy ounce
  silver: number; // Price per troy ounce
  /** Per troy ounce; missing or not above zero when unknown (the feed has no palladium). */
  platinum?: number;
  palladium?: number;
  timestamp: Date;
}