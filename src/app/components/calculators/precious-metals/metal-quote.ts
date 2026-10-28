import type { jsPDF } from 'jspdf';
import { buildQuotePdf, QuoteSection, quoteFileName as fileName, quoteMoney as money } from '../../../services/quote-pdf';

export interface MetalQuote {
  name: string;
  date: Date;
  spotPrices: SpotPrices;
  /** Which spot prices were typed in by hand rather than taken from the live feed. */
  manual: Partial<Record<'gold' | 'silver' | 'platinum' | 'palladium', boolean>>;
  gold: PreciousMetalBreakdown[];
  silver: PreciousMetalBreakdown[];
  goldTotals: MetalTotals;
  silverTotals: MetalTotals;
  /** Platinum and palladium, each only when it has pieces. */
  others?: { title: 'Platinum' | 'Palladium'; breakdowns: PreciousMetalBreakdown[]; totals: MetalTotals }[];
  grandTotals: { spotValue: number; value90: number; value80: number; value70: number };
  offer: { amount: number; percent: number } | null;
}

export function quoteFileName(quote: MetalQuote): string {
  return fileName(quote.name, quote.date, 'metals-quote');
}

/** Platinum and palladium are listed only when known, so a gold-and-silver quote reads as it always has. */
export function spotPriceLine(prices: SpotPrices, manual: MetalQuote['manual']): string {
  const metals = [['gold', 'Gold'], ['silver', 'Silver'], ['platinum', 'Platinum'], ['palladium', 'Palladium']] as const;
  return 'Spot: ' + metals
    .filter(([metal]) => (prices[metal] ?? 0) > 0)
    .map(([metal, label]) => `${label} ${money.format(prices[metal]!)}/oz t${manual[metal] ? ' (set by hand)' : ''}`)
    .join('   ·   ');
}

/** Pieces by metal, then the combined totals and any offer. */
export function buildMetalQuote(PDF: typeof jsPDF, quote: MetalQuote): jsPDF {
  const section = (title: string, rows: PreciousMetalBreakdown[], totals: MetalTotals): QuoteSection => ({
    title,
    columns: ['Weight', 'Pure oz t', 'Spot value'],
    rows: rows.map(row => ({
      label: row.type,
      note: [row.note, row.stoneCarats ? `less ${row.stoneCarats} ct stone` : undefined]
        .filter(Boolean).join(' · ') || undefined,
      cells: [`${row.weightGrams.toFixed(2)} g`, row.pureWeightToz.toFixed(4), money.format(row.spotValue)],
    })),
    total: {
      label: `${title} total`,
      cells: [`${totals.totalWeightGrams.toFixed(2)} g`, totals.totalPureToz.toFixed(4), money.format(totals.spotValue)],
    },
  });

  return buildQuotePdf(PDF, {
    title: quote.name.trim() || 'Precious Metals Quote',
    date: quote.date,
    details: [spotPriceLine(quote.spotPrices, quote.manual)],
    sections: [
      section('Gold', quote.gold, quote.goldTotals),
      section('Silver', quote.silver, quote.silverTotals),
      ...(quote.others ?? []).map(other => section(other.title, other.breakdowns, other.totals)),
    ],
    summary: [
      ['Total spot value', money.format(quote.grandTotals.spotValue)],
      ['90% of spot', money.format(quote.grandTotals.value90)],
      ['80% of spot', money.format(quote.grandTotals.value80)],
      ['70% of spot', money.format(quote.grandTotals.value70)],
    ],
    offer: quote.offer ? `${money.format(quote.offer.amount)}  (${quote.offer.percent}% of spot)` : undefined,
    footer: 'Melt values from pure metal content at the spot prices above. Not an appraisal.',
  });
}
