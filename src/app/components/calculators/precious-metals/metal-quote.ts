import type { jsPDF } from 'jspdf';

export interface MetalQuote {
  name: string;
  date: Date;
  spotPrices: SpotPrices;
  /** Which spot prices were typed in by hand rather than taken from the live feed. */
  manual: { gold: boolean; silver: boolean };
  gold: PreciousMetalBreakdown[];
  silver: PreciousMetalBreakdown[];
  goldTotals: MetalTotals;
  silverTotals: MetalTotals;
  grandTotals: { spotValue: number; value90: number; value80: number; value70: number };
  offer: { amount: number; percent: number } | null;
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const PAGE_BOTTOM = 740;
const LEFT = 48;
const RIGHT = 564;
// Right edges of the number columns, in points on a letter page.
const COLUMNS = { weight: 380, pure: 470, value: RIGHT };

export function quoteFileName(quote: MetalQuote): string {
  const slug = quote.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const day = quote.date.toISOString().slice(0, 10);
  return `${slug || 'metals-quote'}-${day}.pdf`;
}

/** Lays the quote out on letter-size pages: pieces by metal, then totals and any offer. */
export function buildMetalQuote(PDF: typeof jsPDF, quote: MetalQuote): jsPDF {
  const doc = new PDF({ unit: 'pt', format: 'letter' });
  let y = 56;

  const ensureRoom = (needed: number) => {
    if (y + needed > PAGE_BOTTOM) {
      doc.addPage();
      y = 56;
    }
  };
  const right = (text: string, x: number) => doc.text(text, x, y, { align: 'right' });
  const rule = () => {
    doc.setDrawColor(200);
    doc.line(LEFT, y, RIGHT, y);
  };

  doc.setFont('helvetica', 'bold').setFontSize(18);
  doc.text(quote.name.trim() || 'Precious Metals Quote', LEFT, y);
  y += 20;
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(90);
  doc.text(quote.date.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }), LEFT, y);
  y += 14;
  const price = (metal: 'gold' | 'silver', label: string) =>
    `${label} ${money.format(quote.spotPrices[metal])}/oz t${quote.manual[metal] ? ' (set by hand)' : ''}`;
  doc.text(`Spot: ${price('gold', 'Gold')}   ·   ${price('silver', 'Silver')}`, LEFT, y);
  y += 26;

  const section = (title: string, rows: PreciousMetalBreakdown[], totals: MetalTotals) => {
    if (rows.length === 0) return;
    ensureRoom(60);
    doc.setTextColor(0).setFont('helvetica', 'bold').setFontSize(12);
    doc.text(title, LEFT, y);
    doc.setFontSize(9).setTextColor(90);
    right('Weight', COLUMNS.weight);
    right('Pure oz t', COLUMNS.pure);
    right('Spot value', COLUMNS.value);
    y += 6;
    rule();
    y += 14;

    doc.setFont('helvetica', 'normal').setFontSize(10);
    for (const row of rows) {
      ensureRoom(row.note ? 28 : 16);
      doc.setTextColor(0);
      doc.text(row.type, LEFT, y);
      right(`${row.weightGrams.toFixed(2)} g`, COLUMNS.weight);
      right(row.pureWeightToz.toFixed(4), COLUMNS.pure);
      right(money.format(row.spotValue), COLUMNS.value);
      if (row.note) {
        y += 12;
        doc.setFontSize(9).setTextColor(110);
        doc.text(row.note, LEFT + 10, y);
        doc.setFontSize(10);
      }
      y += 16;
    }

    rule();
    y += 14;
    doc.setTextColor(0).setFont('helvetica', 'bold');
    doc.text(`${title} total`, LEFT, y);
    right(`${totals.totalWeightGrams.toFixed(2)} g`, COLUMNS.weight);
    right(totals.totalPureToz.toFixed(4), COLUMNS.pure);
    right(money.format(totals.spotValue), COLUMNS.value);
    doc.setFont('helvetica', 'normal');
    y += 30;
  };

  section('Gold', quote.gold, quote.goldTotals);
  section('Silver', quote.silver, quote.silverTotals);

  const totals: [string, number][] = [
    ['Total spot value', quote.grandTotals.spotValue],
    ['90% of spot', quote.grandTotals.value90],
    ['80% of spot', quote.grandTotals.value80],
    ['70% of spot', quote.grandTotals.value70],
  ];
  ensureRoom(totals.length * 18 + (quote.offer ? 30 : 0) + 40);
  doc.setTextColor(0).setFontSize(11);
  totals.forEach(([label, value], index) => {
    doc.setFont('helvetica', index === 0 ? 'bold' : 'normal');
    doc.text(label, COLUMNS.pure - 140, y);
    right(money.format(value), COLUMNS.value);
    y += 18;
  });

  if (quote.offer) {
    y += 4;
    rule();
    y += 18;
    doc.setFont('helvetica', 'bold').setFontSize(13);
    doc.text('Offer', COLUMNS.pure - 140, y);
    right(`${money.format(quote.offer.amount)}  (${quote.offer.percent}% of spot)`, COLUMNS.value);
    y += 18;
  }

  y += 16;
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120);
  doc.text('Melt values from pure metal content at the spot prices above. Not an appraisal.', LEFT, y);
  return doc;
}
