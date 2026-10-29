import { jsPDF } from 'jspdf';

import { buildMetalQuote, MetalQuote, quoteFileName, quoteText } from './metal-quote';

const totals = (spotValue: number, grams: number, pureToz: number): MetalTotals => ({
  totalWeightGrams: grams,
  totalWeightToz: grams / 31.1035,
  totalPureGrams: pureToz * 31.1035,
  totalPureToz: pureToz,
  spotValue,
  value90: spotValue * 0.9,
  value80: spotValue * 0.8,
  value70: spotValue * 0.7,
});

const ring: PreciousMetalBreakdown = {
  type: '14K Gold (58.3%)',
  note: 'nugget ring',
  weightGrams: 10,
  weightToz: 10 / 31.1035,
  pureWeightGrams: 5.83,
  pureWeightToz: 0.1874,
  spotValue: 374.88,
  value90: 337.39,
  value80: 299.9,
};

const quote = (overrides: Partial<MetalQuote> = {}): MetalQuote => ({
  name: 'Smith estate',
  date: new Date('2026-10-10T15:00:00Z'),
  spotPrices: { gold: 2000, silver: 25, timestamp: new Date() },
  manual: { gold: false, silver: true },
  gold: [ring],
  silver: [],
  goldTotals: totals(374.88, 10, 0.1874),
  silverTotals: totals(0, 0, 0),
  grandTotals: { spotValue: 374.88, value90: 337.39, value80: 299.9, value70: 262.42 },
  offer: null,
  ...overrides,
});

/** The uncompressed PDF source, where each line of text appears as a literal string. */
const source = (q: MetalQuote) => buildMetalQuote(jsPDF, q).output();

describe('metal quote text', () => {
  it('should list the pieces by metal with totals, ready to paste', () => {
    const text = quoteText(quote({ gold: [{ ...ring, stoneCarats: 0.5 }], offer: { amount: 300, percent: 80 } }));

    expect(text.split('\n')).toEqual([
      'Smith estate · Oct 10, 2026',
      'Spot: Gold $2,000.00/oz t   ·   Silver $25.00/oz t (set by hand)',
      '',
      'Gold',
      '- 14K Gold (58.3%) (nugget ring · less 0.5 ct stone): 10.00 g, $374.88',
      'Gold total: $374.88',
      '',
      'Total spot value: $374.88',
      '90%: $337.39 · 80%: $299.90 · 70%: $262.42',
      'Offer: $300.00 (80% of spot)',
    ]);
  });
});

describe('metal quote', () => {
  it('should name the file after the list and the day', () => {
    expect(quoteFileName(quote())).toBe('smith-estate-2026-10-10.pdf');
    expect(quoteFileName(quote({ name: '  ' }))).toBe('metals-quote-2026-10-10.pdf');
    expect(quoteFileName(quote({ name: 'Bob\'s #2 lot!' }))).toBe('bob-s-2-lot-2026-10-10.pdf');
  });

  it('should list each piece with its note, the spot prices used, and the totals', () => {
    const pdf = source(quote());

    expect(pdf).toContain('(Smith estate)');
    expect(pdf).toContain('Gold $2,000.00/oz t');
    expect(pdf).toContain('Silver $25.00/oz t \\(set by hand\\)');
    expect(pdf).toContain('(14K Gold \\(58.3%\\))');
    expect(pdf).toContain('(nugget ring)');
    expect(pdf).toContain('(10.00 g)');
    expect(pdf).toContain('(0.1874)');
    expect(pdf).toContain('($374.88)');
    expect(pdf).toContain('($262.42)');
    expect(pdf).not.toContain('(Silver)');
    expect(pdf).not.toContain('(Offer)');
  });

  it('should add platinum and palladium sections and prices only when present', () => {
    const band = { ...ring, type: 'Platinum (95%)', note: '950 band' };
    const pdf = source(quote({
      spotPrices: { gold: 2000, silver: 25, platinum: 1000, palladium: -1, timestamp: new Date() },
      manual: { gold: false, silver: false, platinum: true },
      others: [{ title: 'Platinum', breakdowns: [band], totals: totals(374.88, 10, 0.1874) }],
    }));

    expect(pdf).toContain('Platinum $1,000.00/oz t \\(set by hand\\)');
    expect(pdf).not.toContain('Palladium');
    expect(pdf).toContain('(Platinum)');
    expect(pdf).toContain('(950 band)');
    expect(source(quote())).not.toContain('Platinum');
  });

  it('should fall back to a generic title and include an offer when given', () => {
    const pdf = source(quote({ name: '', offer: { amount: 300, percent: 80.02 } }));

    expect(pdf).toContain('(Precious Metals Quote)');
    expect(pdf).toContain('(Offer)');
    expect(pdf).toContain('$300.00  \\(80.02% of spot\\)');
  });

  it('should continue onto a new page when there are many pieces', () => {
    const many = Array.from({ length: 60 }, () => ring);
    const doc = buildMetalQuote(jsPDF, quote({ gold: many }));

    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
});
