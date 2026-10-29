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

function pieceNote(row: PreciousMetalBreakdown): string | undefined {
  return [row.note, row.stoneCarats ? `less ${row.stoneCarats} ct stone` : undefined].filter(Boolean).join(' · ') || undefined;
}

/** The quote as plain text, short enough to paste into a message to a buyer. */
export function quoteText(quote: MetalQuote): string {
  const day = quote.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const sections = [
    ['Gold', quote.gold, quote.goldTotals] as const,
    ['Silver', quote.silver, quote.silverTotals] as const,
    ...(quote.others ?? []).map(other => [other.title, other.breakdowns, other.totals] as const),
  ].filter(([, rows]) => rows.length > 0);

  const lines = [`${quote.name.trim() || 'Precious Metals Quote'} · ${day}`, spotPriceLine(quote.spotPrices, quote.manual)];
  for (const [title, rows, totals] of sections) {
    lines.push('', title);
    for (const row of rows) {
      const note = pieceNote(row);
      lines.push(`- ${row.type}${note ? ` (${note})` : ''}: ${row.weightGrams.toFixed(2)} g, ${money.format(row.spotValue)}`);
    }
    lines.push(`${title} total: ${money.format(totals.spotValue)}`);
  }
  const { spotValue, value90, value80, value70 } = quote.grandTotals;
  lines.push('', `Total spot value: ${money.format(spotValue)}`,
    `90%: ${money.format(value90)} · 80%: ${money.format(value80)} · 70%: ${money.format(value70)}`);
  if (quote.offer) {
    lines.push(`Offer: ${money.format(quote.offer.amount)} (${quote.offer.percent}% of spot)`);
  }
  return lines.join('\n');
}

/** Pieces by metal, then the combined totals and any offer. */
export function buildMetalQuote(PDF: typeof jsPDF, quote: MetalQuote): jsPDF {
  const section = (title: string, rows: PreciousMetalBreakdown[], totals: MetalTotals): QuoteSection => ({
    title,
    columns: ['Weight', 'Pure oz t', 'Spot value'],
    rows: rows.map(row => ({
      label: row.type,
      note: pieceNote(row),
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
