export const goldTypes: MetalType[] = [
    { name: '24K Gold (99.9%)', purity: 0.999 },
    { name: '22K Gold (91.7%)', purity: 0.917 },
    { name: '18K Gold (75%)', purity: 0.75 },
    { name: '14K Gold (58.3%)', purity: 0.583 },
    { name: '10K Gold (41.7%)', purity: 0.417 }
];

/** Scrap and old pieces come in odd finenesses (a 60% silver, a 15K gold), so a row can take its own percent. */
export const CUSTOM_PURITY = 'Custom %';

export const silverTypes: MetalType[] = [
    { name: 'Fine Silver (99.9%)', purity: 0.999 },
    { name: 'Sterling Silver (92.5%)', purity: 0.925 },
    { name: 'Coin Silver (90%)', purity: 0.90 },
    { name: 'German/European (80%)', purity: 0.80 },
];

export const emptyMetalTotal: MetalTotals = {
    totalWeightGrams: 0,
    totalWeightToz: 0,
    totalPureGrams: 0,
    totalPureToz: 0,
    spotValue: 0,
    value90: 0,
    value80: 0,
    value70: 0,
};

export const ASC: 'asc' = 'asc';
export const DESC: 'desc' = 'desc';
export const TROY_OZ_IN_GRAMS: number = 31.1035;
/** Troy units are what dealers quote; the rest are what a kitchen or postal scale might read. */
export const METAL_UNITS: MetalUnit[] = [
    { id: 'grams', label: 'g', grams: 1, code: 'g' },
    { id: 'toz', label: 'oz t', grams: TROY_OZ_IN_GRAMS, code: 't' },
    { id: 'dwt', label: 'dwt', grams: TROY_OZ_IN_GRAMS / 20, code: 'dwt' },
    { id: 'grain', label: 'gr', grams: TROY_OZ_IN_GRAMS / 480, code: 'gr' },
    { id: 'lbt', label: 'lb t', grams: TROY_OZ_IN_GRAMS * 12, code: 'lbt' },
    { id: 'mg', label: 'mg', grams: 0.001, code: 'mg' },
    { id: 'kg', label: 'kg', grams: 1000, code: 'kg' },
    { id: 'oz', label: 'oz', grams: 28.349523125, code: 'oz' },
    { id: 'lb', label: 'lb', grams: 453.59237, code: 'lb' },
    { id: 'tola', label: 'tola', grams: 11.6638038, code: 'tola' },
];

export function findMetalUnit(id: unknown): MetalUnit | undefined {
    return METAL_UNITS.find(unit => unit.id === id);
}
