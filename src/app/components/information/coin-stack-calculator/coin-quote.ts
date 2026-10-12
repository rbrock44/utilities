import type { jsPDF } from 'jspdf';
import { buildQuotePdf, QuoteSection, quoteMoney as money } from '../../../services/quote-pdf';

export interface CoinQuoteRow {
  label: string;
  metal: 'gold' | 'silver';
  quantity: number;
  pureToz: number;
  melt: number;
  note?: string;
}

export interface CoinQuote {
  name: string;
  date: Date;
  spotGold: number | null;
  spotSilver: number | null;
  dealerPercent: number;
  rows: CoinQuoteRow[];
  melt: number;
  dealer: number;
}

/** Coins by metal with quantity, pure content, and melt, then the stack's melt and dealer offer. */
export function buildCoinQuote(PDF: typeof jsPDF, quote: CoinQuote): jsPDF {
  const section = (title: string, metal: 'gold' | 'silver'): QuoteSection => {
    const rows = quote.rows.filter(row => row.metal === metal && row.quantity > 0);
    const sum = (pick: (row: CoinQuoteRow) => number) => rows.reduce((total, row) => total + pick(row), 0);
    return {
      title,
      columns: ['Qty', 'Pure oz t', 'Melt'],
      rows: rows.map(row => ({
        label: row.label,
        note: row.note,
        cells: [`× ${row.quantity}`, row.pureToz.toFixed(4), money.format(row.melt)],
      })),
      total: {
        label: `${title} total`,
        cells: [coins(sum(row => row.quantity)), sum(row => row.pureToz).toFixed(4), money.format(sum(row => row.melt))],
      },
    };
  };
  const coins = (count: number) => `${count} coin${count === 1 ? '' : 's'}`;
  const price = (label: string, value: number | null) => `${label} ${value ? money.format(value) : '—'}/oz t`;

  return buildQuotePdf(PDF, {
    title: quote.name.trim() || 'Coin Stack Quote',
    date: quote.date,
    details: [`Spot: ${price('Gold', quote.spotGold)}   ·   ${price('Silver', quote.spotSilver)}`],
    sections: [section('Gold coins', 'gold'), section('Silver coins', 'silver')],
    summary: [
      ['Melt value', money.format(quote.melt)],
      [`Dealer offer at ${quote.dealerPercent}%`, money.format(quote.dealer)],
    ],
    footer: 'Melt values from standard coin weights and purities at the spot prices above. Not an appraisal.',
  });
}
