import type { jsPDF } from 'jspdf';

/** Three right-aligned number columns, e.g. weight, pure oz t, and value. */
export type QuoteCells = [string, string, string];

export interface QuoteRow {
  label: string;
  note?: string;
  cells: QuoteCells;
}

export interface QuoteSection {
  title: string;
  columns: QuoteCells;
  rows: QuoteRow[];
  total?: QuoteRow;
}

export interface QuoteDocument {
  title: string;
  date: Date;
  /** Grey lines under the date, e.g. the spot prices used. */
  details: string[];
  sections: QuoteSection[];
  /** Label and value pairs under the sections; the first is shown in bold. */
  summary: [string, string][];
  offer?: string;
  footer: string;
}

export const quoteMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const PAGE_TOP = 56;
const PAGE_BOTTOM = 740;
const LEFT = 48;
const RIGHT = 564;
// Right edges of the number columns, in points on a letter page.
const COLUMN_EDGES = [380, 470, RIGHT];
const SUMMARY_LEFT = COLUMN_EDGES[1] - 140;

export function quoteFileName(name: string, date: Date, fallback: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug || fallback}-${date.toISOString().slice(0, 10)}.pdf`;
}

/** Lays a quote out on letter-size pages: titled sections of rows, then a summary and any offer. */
export function buildQuotePdf(PDF: typeof jsPDF, quote: QuoteDocument): jsPDF {
  const doc = new PDF({ unit: 'pt', format: 'letter' });
  let y = PAGE_TOP;

  const ensureRoom = (needed: number) => {
    if (y + needed > PAGE_BOTTOM) {
      doc.addPage();
      y = PAGE_TOP;
    }
  };
  const cells = (values: QuoteCells) =>
    values.forEach((value, index) => doc.text(value, COLUMN_EDGES[index], y, { align: 'right' }));
  const rule = () => {
    doc.setDrawColor(200);
    doc.line(LEFT, y, RIGHT, y);
  };

  doc.setFont('helvetica', 'bold').setFontSize(18);
  doc.text(quote.title, LEFT, y);
  y += 20;
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(90);
  doc.text(quote.date.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }), LEFT, y);
  for (const line of quote.details) {
    y += 14;
    doc.text(line, LEFT, y);
  }
  y += 26;

  for (const section of quote.sections) {
    if (section.rows.length === 0) continue;
    ensureRoom(60);
    doc.setTextColor(0).setFont('helvetica', 'bold').setFontSize(12);
    doc.text(section.title, LEFT, y);
    doc.setFontSize(9).setTextColor(90);
    cells(section.columns);
    y += 6;
    rule();
    y += 14;

    doc.setFont('helvetica', 'normal').setFontSize(10);
    for (const row of section.rows) {
      ensureRoom(row.note ? 28 : 16);
      doc.setTextColor(0);
      doc.text(row.label, LEFT, y);
      cells(row.cells);
      if (row.note) {
        y += 12;
        doc.setFontSize(9).setTextColor(110);
        doc.text(row.note, LEFT + 10, y);
        doc.setFontSize(10);
      }
      y += 16;
    }

    if (section.total) {
      rule();
      y += 14;
      doc.setTextColor(0).setFont('helvetica', 'bold');
      doc.text(section.total.label, LEFT, y);
      cells(section.total.cells);
      doc.setFont('helvetica', 'normal');
      y += 14;
    }
    y += 16;
  }

  ensureRoom(quote.summary.length * 18 + (quote.offer ? 30 : 0) + 40);
  doc.setTextColor(0).setFontSize(11);
  quote.summary.forEach(([label, value], index) => {
    doc.setFont('helvetica', index === 0 ? 'bold' : 'normal');
    doc.text(label, SUMMARY_LEFT, y);
    doc.text(value, RIGHT, y, { align: 'right' });
    y += 18;
  });

  if (quote.offer) {
    y += 4;
    rule();
    y += 18;
    doc.setFont('helvetica', 'bold').setFontSize(13);
    doc.text('Offer', SUMMARY_LEFT, y);
    doc.text(quote.offer, RIGHT, y, { align: 'right' });
    y += 18;
  }

  y += 16;
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120);
  doc.text(quote.footer, LEFT, y);
  return doc;
}
