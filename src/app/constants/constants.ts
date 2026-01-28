export const SILVER_COIN_DATABASE: CoinSpec[] = [
    // US Coins
    { name: 'Morgan Dollar', weightGrams: 26.73, silverPurity: 0.900, description: '1878-1921' },
    { name: 'Peace Dollar', weightGrams: 26.73, silverPurity: 0.900, description: '1921-1935' },
    { name: 'Kennedy Half Dollar', weightGrams: 11.50, silverPurity: 0.400, description: '1965-1970' },
    { name: 'Kennedy Half Dollar', weightGrams: 12.50, silverPurity: 0.900, description: '1964' },
    { name: 'Walking Liberty Half', weightGrams: 12.50, silverPurity: 0.900, description: '1916-1947' },
    { name: 'Franklin Half Dollar', weightGrams: 12.50, silverPurity: 0.900, description: '1948-1963' },
    { name: 'Washington Quarter', weightGrams: 6.25, silverPurity: 0.900, description: 'Pre-1965' },
    { name: 'Mercury Dime', weightGrams: 2.50, silverPurity: 0.900, description: '1916-1945' },
    { name: 'Roosevelt Dime', weightGrams: 2.50, silverPurity: 0.900, description: 'Pre-1965' },
    { name: 'Barber Dime', weightGrams: 2.50, silverPurity: 0.900, description: '1892-1916' },
    { name: 'Barber Quarter', weightGrams: 6.25, silverPurity: 0.900, description: '1892-1916' },
    { name: 'Barber Half Dollar', weightGrams: 12.50, silverPurity: 0.900, description: '1892-1915' },
    { name: 'Jefferson Nickel (War Nickel)', weightGrams: 5.00, silverPurity: 0.350, description: '1942-1945 (35% silver)' },
    { name: 'Shield Nickel', weightGrams: 5.00, silverPurity: 0.000, description: '1866-1883 (No silver)' },
    { name: 'Liberty Head Nickel', weightGrams: 5.00, silverPurity: 0.000, description: '1883-1913 (No silver)' },
    { name: 'Buffalo Nickel', weightGrams: 5.00, silverPurity: 0.000, description: '1913-1938 (No silver)' },
    { name: 'Jefferson Nickel (Regular)', weightGrams: 5.00, silverPurity: 0.000, description: '1938-present (No silver)' },

    // Canadian Coins
    { name: 'Canadian Silver Dollar', weightGrams: 23.33, silverPurity: 0.800, description: '1935-1967' },
    { name: 'Canadian Half Dollar', weightGrams: 11.66, silverPurity: 0.800, description: '1920-1967' },
    { name: 'Canadian Quarter', weightGrams: 5.83, silverPurity: 0.800, description: '1920-1967' },
    { name: 'Canadian Dime', weightGrams: 2.33, silverPurity: 0.800, description: '1920-1967' },
    { name: 'Canadian Nickel', weightGrams: 4.54, silverPurity: 0.000, description: '1922-present (No silver)' },
    { name: 'Canadian Silver Nickel', weightGrams: 4.60, silverPurity: 0.800, description: '1920-1921 (80% silver)' },

    // Bullion
    { name: 'American Silver Eagle', weightGrams: 31.103, silverPurity: 0.999, description: '1 oz' },
    { name: 'Canadian Maple Leaf', weightGrams: 31.103, silverPurity: 0.9999, description: '1 oz' },
    { name: 'Austrian Philharmonic', weightGrams: 31.103, silverPurity: 0.999, description: '1 oz' },
    { name: 'Mexican Libertad', weightGrams: 31.103, silverPurity: 0.999, description: '1 oz' },

    // British Coins
    { name: 'British Crown', weightGrams: 28.28, silverPurity: 0.925, description: 'Pre-1947' },
    { name: 'British Half Crown', weightGrams: 14.14, silverPurity: 0.925, description: 'Pre-1947' },
    { name: 'British Shilling', weightGrams: 5.66, silverPurity: 0.925, description: 'Pre-1947' },
    { name: 'British Sixpence', weightGrams: 2.83, silverPurity: 0.925, description: 'Pre-1947' },

    // Other
    { name: 'Generic Silver Round', weightGrams: 31.103, silverPurity: 0.999, description: '1 oz' },
    { name: '90% Junk Silver (per $1 face)', weightGrams: 25.00, silverPurity: 0.900, description: 'US coins' },
];

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

export const TROY_OZ_IN_GRAMS: number = 31.1035;