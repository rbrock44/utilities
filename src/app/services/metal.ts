import { Injectable } from "@angular/core";
import { CUSTOM_SILVER, goldTypes, silverTypes, TROY_OZ_IN_GRAMS } from "../constants/constants";

@Injectable({
  providedIn: 'root'
})
export class MetalService {
  calculateGoldPrice(spotPrices: SpotPrices, rows: MetalRow[]): MetalCalculation {
    return this.calculateMetal(spotPrices.gold, rows, goldTypes);
  }

  calculateSilverPrice(spotPrices: SpotPrices, rows: MetalRow[]) {
    return this.calculateMetal(spotPrices.silver, rows, silverTypes);
  }

  private calculateMetal(spotPriceForMetal: number, rows: MetalRow[], types: MetalType[]): MetalCalculation {
    const breakdowns: PreciousMetalBreakdown[] = [];
    let totalWeightGrams = 0;
    let totalPureGrams = 0;

    rows.forEach(row => {
      if (row.weight <= 0) return;

      const metalType = this.typeFor(row, types);
      if (!metalType) return;

      const weightGrams = row.unit === 'grams' ? row.weight : row.weight * TROY_OZ_IN_GRAMS;
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

  /** A custom silver row becomes a one-off type named after its percent, e.g. "Silver 70%". */
  private typeFor(row: MetalRow, types: MetalType[]): MetalType | undefined {
    if (row.type === CUSTOM_SILVER && types === silverTypes) {
      const percent = row.purity;
      return percent !== undefined && Number.isFinite(percent) && percent > 0 && percent <= 100
        ? { name: `Silver ${percent}%`, purity: percent / 100 }
        : undefined;
    }
    return types.find(t => t.name === row.type);
  }
}
