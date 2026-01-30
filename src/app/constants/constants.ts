export const goldTypes: MetalType[] = [
    { name: '24K Gold (99.9%)', purity: 0.999 },
    { name: '22K Gold (91.7%)', purity: 0.917 },
    { name: '18K Gold (75%)', purity: 0.75 },
    { name: '14K Gold (58.3%)', purity: 0.583 },
    { name: '10K Gold (41.7%)', purity: 0.417 }
];

export const silverTypes: MetalType[] = [
    { name: 'Fine Silver (99.9%)', purity: 0.999 },
    { name: 'Sterling Silver (92.5%)', purity: 0.925 },
    { name: 'Coin Silver (90%)', purity: 0.90 },
    { name: 'German/European (80%)', purity: 0.80 },
    { name: 'German/European (80%)', purity: 0.80 },
];

export const emptyMetalTotal: MetalTotals = {
    totalWeightGrams: 0,
    totalWeightToz: 0,
    totalPureGrams: 0,
    totalPureToz: 0,
    spotValue: 0,
    value90: 0,
    value80: 0
};

export const ASC: 'asc' = 'asc';
export const DESC: 'desc' = 'desc';
export const TROY_OZ_IN_GRAMS: number = 31.1035;