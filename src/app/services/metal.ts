import { Injectable } from "@angular/core";
import { CARAT_IN_GRAMS, CUSTOM_PURITY, findMetalUnit, goldTypes, palladiumTypes, platinumTypes, silverTypes, TROY_OZ_IN_GRAMS } from "../constants/constants";

/** Blank, negative, or not-a-number stone weights count as no stone. */
export function validStone(stone: number | null | undefined): number {
  return typeof stone === 'number' && Number.isFinite(stone) && stone > 0 ? stone : 0;
}

@Injectable({
  providedIn: 'root'
})
export class MetalService {
  calculateGoldPrice(spotPrices: SpotPrices, rows: MetalRow[]): MetalCalculation {
    return this.calculateMetal(spotPrices.gold, rows, goldTypes, 'Gold');
  }

  calculateSilverPrice(spotPrices: SpotPrices, rows: MetalRow[]) {
    return this.calculateMetal(spotPrices.silver, rows, silverTypes, 'Silver');
  }

  /** Without a price, platinum and palladium pieces are still weighed but valued at nothing. */
  calculatePlatinumPrice(spotPrices: SpotPrices, rows: MetalRow[]): MetalCalculation {
    return this.calculateMetal(Math.max(0, spotPrices.platinum ?? 0), rows, platinumTypes, 'Platinum');
  }

  calculatePalladiumPrice(spotPrices: SpotPrices, rows: MetalRow[]): MetalCalculation {
    return this.calculateMetal(Math.max(0, spotPrices.palladium ?? 0), rows, palladiumTypes, 'Palladium');
  }

  private calculateMetal(spotPriceForMetal: number, rows: MetalRow[], types: MetalType[], label: string): MetalCalculation {
    const breakdowns: PreciousMetalBreakdown[] = [];
    let totalWeightGrams = 0;
    let totalPureGrams = 0;

    rows.forEach(row => {
      if (row.weight <= 0) return;

      const metalType = this.typeFor(row, types, label);
      if (!metalType) return;

      const unit = findMetalUnit(row.unit);
      if (!unit) return;

      // A stone weighs nothing as metal, so it comes off before the piece is valued.
      const stoneCarats = validStone(row.stone);
      const weightGrams = row.weight * unit.grams - stoneCarats * CARAT_IN_GRAMS;
      if (weightGrams <= 0) return;
      const weightToz = weightGrams / TROY_OZ_IN_GRAMS;
      const pureWeightGrams = weightGrams * metalType.purity;
      const pureWeightToz = pureWeightGrams / TROY_OZ_IN_GRAMS;

      const spotValue = pureWeightToz * spotPriceForMetal;
      const value90 = spotValue * 0.9;
      const value80 = spotValue * 0.8;
      const value70 = spotValue * 0.7;

      breakdowns.push({
        type: metalType.name,
        ...(row.note?.trim() ? { note: row.note.trim() } : {}),
        ...(stoneCarats > 0 ? { stoneCarats } : {}),
        weightGrams,
        weightToz,
        pureWeightGrams,
        pureWeightToz,
        spotValue,
        value90,
        value80
      });

      totalWeightGrams += weightGrams;
      totalPureGrams += pureWeightGrams;
    });

    const totalWeightToz = totalWeightGrams / TROY_OZ_IN_GRAMS;
    const totalPureToz = totalPureGrams / TROY_OZ_IN_GRAMS;

    const totals = {
      totalWeightGrams,
      totalWeightToz,
      totalPureGrams,
      totalPureToz,
      spotValue: totalPureToz * spotPriceForMetal,
      value90: totalPureToz * spotPriceForMetal * 0.9,
      value80: totalPureToz * spotPriceForMetal * 0.8,
      value70: totalPureToz * spotPriceForMetal * 0.7,
    };

    return {
      breakdowns: breakdowns,
      totals: totals
    }
  }

  /** A custom row becomes a one-off type named after its percent, e.g. "Silver 70%". */
  private typeFor(row: MetalRow, types: MetalType[], label: string): MetalType | undefined {
    if (row.type === CUSTOM_PURITY) {
      const percent = row.purity;
      return percent !== undefined && Number.isFinite(percent) && percent > 0 && percent <= 100
        ? { name: row.label ?? `${label} ${percent}%`, purity: percent / 100 }
        : undefined;
    }
    return types.find(t => t.name === row.type);
  }
}
