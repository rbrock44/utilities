export const GOLD_COIN_DATABASE: CoinSpec[] = [
    // US Gold Coins - Eagles
    { name: 'American Gold Eagle', weightGrams: 33.931, purity: 0.9167, description: '1 oz (22K)', years: { from: 1986 } },
    { name: 'American Gold Eagle (1/2 oz)', weightGrams: 16.966, purity: 0.9167, description: '1/2 oz (22K)', years: { from: 1986 } },
    { name: 'American Gold Eagle (1/4 oz)', weightGrams: 8.483, purity: 0.9167, description: '1/4 oz (22K)', years: { from: 1986 } },
    { name: 'American Gold Eagle (1/10 oz)', weightGrams: 3.393, purity: 0.9167, description: '1/10 oz (22K)', years: { from: 1986 } },
    
    // US Gold Coins - Buffalo
    { name: 'American Gold Buffalo', weightGrams: 31.103, purity: 0.9999, description: '1 toz (24K)', years: { from: 2006 } },
    { name: 'American Gold Buffalo (1/2 oz)', weightGrams: 15.552, purity: 0.9999, description: '1/2 toz (24K)', years: { from: 2008, to: 2008 } },
    { name: 'American Gold Buffalo (1/4 oz)', weightGrams: 7.776, purity: 0.9999, description: '1/4 toz (24K)', years: { from: 2008, to: 2008 } },
    { name: 'American Gold Buffalo (1/10 oz)', weightGrams: 3.110, purity: 0.9999, description: '1/10 toz (24K)', years: { from: 2008, to: 2008 } },
    
    // US Historic Gold Coins
    { name: 'Double Eagle ($20)', weightGrams: 33.436, purity: 0.900, description: '1849-1933' },
    { name: 'Saint-Gaudens Double Eagle ($20)', weightGrams: 33.436, purity: 0.900, description: '1907-1933' },
    { name: 'Liberty Head Double Eagle ($20)', weightGrams: 33.436, purity: 0.900, description: '1849-1907' },
    { name: 'Eagle ($10)', weightGrams: 16.718, purity: 0.900, description: '1795-1933' },
    { name: 'Indian Head Eagle ($10)', weightGrams: 16.718, purity: 0.900, description: '1907-1933' },
    { name: 'Liberty Head Eagle ($10)', weightGrams: 16.718, purity: 0.900, description: '1838-1907' },
    { name: 'Half Eagle ($5)', weightGrams: 8.359, purity: 0.900, description: '1795-1929' },
    { name: 'Indian Head Half Eagle ($5)', weightGrams: 8.359, purity: 0.900, description: '1908-1929' },
    { name: 'Liberty Head Half Eagle ($5)', weightGrams: 8.359, purity: 0.900, description: '1839-1908' },
    { name: 'Quarter Eagle ($2.50)', weightGrams: 4.180, purity: 0.900, description: '1796-1929' },
    { name: 'Indian Head Quarter Eagle ($2.50)', weightGrams: 4.180, purity: 0.900, description: '1908-1929' },
    { name: 'Gold Dollar ($1)', weightGrams: 1.672, purity: 0.900, description: '1849-1889' },
    { name: '$3 Gold Piece', weightGrams: 5.015, purity: 0.900, description: '1854-1889' },
    
    // Canadian Gold Coins - Maple Leaf
    { name: 'Canadian Gold Maple Leaf', weightGrams: 31.103, purity: 0.9999, description: '1 toz (24K)', years: { from: 1979 } },
    { name: 'Canadian Gold Maple Leaf (1/2 toz)', weightGrams: 15.552, purity: 0.9999, description: '1/2 toz (24K)', years: { from: 1986 } },
    { name: 'Canadian Gold Maple Leaf (1/4 toz)', weightGrams: 7.776, purity: 0.9999, description: '1/4 toz (24K)', years: { from: 1982 } },
    { name: 'Canadian Gold Maple Leaf (1/10 toz)', weightGrams: 3.110, purity: 0.9999, description: '1/10 toz (24K)', years: { from: 1982 } },
    { name: 'Canadian Gold Maple Leaf (1/20 toz)', weightGrams: 1.555, purity: 0.9999, description: '1/20 toz (24K)', years: { from: 1993 } },
    { name: 'Canadian Gold Maple Leaf (1/25 toz)', weightGrams: 1.244, purity: 0.9999, description: '1/25 toz (24K)' },
    
    // British Gold Coins - Sovereign
    { name: 'British Sovereign', weightGrams: 7.988, purity: 0.9167, description: 'Modern (22K)', years: { from: 1957 } },
    { name: 'British Half Sovereign', weightGrams: 3.994, purity: 0.9167, description: 'Modern (22K)', years: { from: 1980 } },
    { name: 'British Quarter Sovereign', weightGrams: 1.997, purity: 0.9167, description: 'Modern (22K)', years: { from: 2009 } },
    { name: 'British Double Sovereign', weightGrams: 15.976, purity: 0.9167, description: 'Modern (22K)', years: { from: 1980 } },
    { name: 'British Five Sovereign', weightGrams: 39.940, purity: 0.9167, description: 'Modern (22K)', years: { from: 1980 } },
    
    // British Gold Coins - Britannia
    { name: 'British Britannia', weightGrams: 31.103, purity: 0.9999, description: '1 toz (24K)', years: { from: 1987 } },
    { name: 'British Britannia (1/2 toz)', weightGrams: 15.552, purity: 0.9999, description: '1/2 toz (24K)', years: { from: 1987 } },
    { name: 'British Britannia (1/4 toz)', weightGrams: 7.776, purity: 0.9999, description: '1/4 toz (24K)', years: { from: 1987 } },
    { name: 'British Britannia (1/10 toz)', weightGrams: 3.110, purity: 0.9999, description: '1/10 toz (24K)', years: { from: 1987 } },
    { name: 'British Britannia (1/20 toz)', weightGrams: 1.555, purity: 0.9999, description: '1/20 toz (24K)' },
    
    // South African Gold Coins - Krugerrand
    { name: 'Krugerrand', weightGrams: 33.930, purity: 0.9167, description: '1 oz (22K)', years: { from: 1967 } },
    { name: 'Krugerrand (1/2 oz)', weightGrams: 16.965, purity: 0.9167, description: '1/2 oz (22K)', years: { from: 1980 } },
    { name: 'Krugerrand (1/4 oz)', weightGrams: 8.482, purity: 0.9167, description: '1/4 oz (22K)', years: { from: 1980 } },
    { name: 'Krugerrand (1/10 oz)', weightGrams: 3.393, purity: 0.9167, description: '1/10 oz (22K)', years: { from: 1980 } },
    
    // Austrian Gold Coins - Philharmonic
    { name: 'Austrian Philharmonic', weightGrams: 31.103, purity: 0.9999, description: '1 toz (24K)', years: { from: 1989 } },
    { name: 'Austrian Philharmonic (1/2 toz)', weightGrams: 15.552, purity: 0.9999, description: '1/2 toz (24K)', years: { from: 1994 } },
    { name: 'Austrian Philharmonic (1/4 toz)', weightGrams: 7.776, purity: 0.9999, description: '1/4 toz (24K)', years: { from: 1989 } },
    { name: 'Austrian Philharmonic (1/10 toz)', weightGrams: 3.110, purity: 0.9999, description: '1/10 toz (24K)', years: { from: 1989 } },
    { name: 'Austrian Philharmonic (1/25 toz)', weightGrams: 1.244, purity: 0.9999, description: '1/25 toz (24K)', years: { from: 2014 } },
    
    // Austrian Historic Gold Coins
    { name: 'Austrian 100 Corona', weightGrams: 33.875, purity: 0.900, description: 'Re-strike' },
    { name: 'Austrian 20 Corona', weightGrams: 6.775, purity: 0.900, description: 'Re-strike' },
    { name: 'Austrian 10 Corona', weightGrams: 3.387, purity: 0.900, description: 'Re-strike' },
    { name: 'Austrian 4 Ducat', weightGrams: 13.964, purity: 0.9860, description: 'Re-strike' },
    { name: 'Austrian Ducat', weightGrams: 3.491, purity: 0.9860, description: 'Re-strike' },
    
    // Chinese Gold Coins - Panda
    { name: 'Chinese Gold Panda', weightGrams: 31.103, purity: 0.999, description: '1 toz', years: { from: 1982, to: 2015 } },
    { name: 'Chinese Gold Panda (30g)', weightGrams: 30.000, purity: 0.999, description: '30 grams', years: { from: 2016 } },
    { name: 'Chinese Gold Panda (15g)', weightGrams: 15.000, purity: 0.999, description: '15 grams', years: { from: 2016 } },
    { name: 'Chinese Gold Panda (8g)', weightGrams: 8.000, purity: 0.999, description: '8 grams', years: { from: 2016 } },
    { name: 'Chinese Gold Panda (3g)', weightGrams: 3.000, purity: 0.999, description: '3 grams', years: { from: 2016 } },
    { name: 'Chinese Gold Panda (1g)', weightGrams: 1.000, purity: 0.999, description: '1 gram', years: { from: 2016 } },
    
    // Australian Gold Coins - Kangaroo/Nugget
    { name: 'Australian Kangaroo/Nugget', weightGrams: 31.103, purity: 0.9999, description: '1 toz (24K)', years: { from: 1986 } },
    { name: 'Australian Kangaroo (1/2 toz)', weightGrams: 15.552, purity: 0.9999, description: '1/2 toz (24K)' },
    { name: 'Australian Kangaroo (1/4 toz)', weightGrams: 7.776, purity: 0.9999, description: '1/4 toz (24K)' },
    { name: 'Australian Kangaroo (1/10 toz)', weightGrams: 3.110, purity: 0.9999, description: '1/10 toz (24K)' },
    { name: 'Australian Kangaroo (1/20 toz)', weightGrams: 1.555, purity: 0.9999, description: '1/20 toz (24K)' },
    
    // Australian Gold Coins - Lunar Series
    { name: 'Australian Lunar Series', weightGrams: 31.103, purity: 0.9999, description: '1 toz (24K)', years: { from: 1996 } },
    { name: 'Australian Lunar Series (1/2 toz)', weightGrams: 15.552, purity: 0.9999, description: '1/2 toz (24K)', years: { from: 1996 } },
    { name: 'Australian Lunar Series (1/4 toz)', weightGrams: 7.776, purity: 0.9999, description: '1/4 toz (24K)', years: { from: 1996 } },
    { name: 'Australian Lunar Series (1/10 toz)', weightGrams: 3.110, purity: 0.9999, description: '1/10 toz (24K)', years: { from: 1996 } },
    { name: 'Australian Lunar Series (1/20 toz)', weightGrams: 1.555, purity: 0.9999, description: '1/20 toz (24K)', years: { from: 1996 } },
    
    // Mexican Gold Coins - Centenario/Peso
    { name: 'Mexican 50 Peso', weightGrams: 41.666, purity: 0.900, description: '1.2057 toz AGW (Centenario)' },
    { name: 'Mexican 20 Peso', weightGrams: 16.666, purity: 0.900, description: '0.4823 toz AGW' },
    { name: 'Mexican 10 Peso', weightGrams: 8.333, purity: 0.900, description: '0.2411 toz AGW' },
    { name: 'Mexican 5 Peso', weightGrams: 4.166, purity: 0.900, description: '0.1205 toz AGW' },
    { name: 'Mexican 2.5 Peso', weightGrams: 2.083, purity: 0.900, description: '0.0603 toz AGW' },
    { name: 'Mexican 2 Peso', weightGrams: 1.666, purity: 0.900, description: '0.0482 toz AGW' },
    
    // Mexican Gold Coins - Libertad
    { name: 'Mexican Libertad', weightGrams: 31.103, purity: 0.999, description: '1 toz', years: { from: 1981 } },
    { name: 'Mexican Libertad (1/2 toz)', weightGrams: 15.552, purity: 0.999, description: '1/2 toz' },
    { name: 'Mexican Libertad (1/4 toz)', weightGrams: 7.776, purity: 0.999, description: '1/4 toz' },
    { name: 'Mexican Libertad (1/10 toz)', weightGrams: 3.110, purity: 0.999, description: '1/10 toz' },
    { name: 'Mexican Libertad (1/20 toz)', weightGrams: 1.555, purity: 0.999, description: '1/20 toz' },
    
    // Swiss Gold Coins
    { name: 'Swiss 20 Franc (Helvetia/Vreneli)', weightGrams: 6.451, purity: 0.900, description: '0.1867 toz AGW' },
    { name: 'Swiss 10 Franc', weightGrams: 3.225, purity: 0.900, description: '0.0933 toz AGW' },
    
    // French Gold Coins
    { name: 'French 20 Franc (Rooster)', weightGrams: 6.451, purity: 0.900, description: '0.1867 toz AGW' },
    { name: 'French 20 Franc (Angel)', weightGrams: 6.451, purity: 0.900, description: '0.1867 toz AGW' },
    { name: 'French 20 Franc (Napoleon)', weightGrams: 6.451, purity: 0.900, description: '0.1867 toz AGW' },
    { name: 'French 10 Franc', weightGrams: 3.225, purity: 0.900, description: '0.0933 toz AGW' },
    { name: 'French 40 Franc', weightGrams: 12.903, purity: 0.900, description: '0.3734 toz AGW' },
    { name: 'French 100 Franc', weightGrams: 32.258, purity: 0.900, description: '0.9335 toz AGW' },
    
    // German Gold Coins
    { name: 'German 20 Mark', weightGrams: 7.965, purity: 0.900, description: '0.2304 toz AGW' },
    { name: 'German 10 Mark', weightGrams: 3.982, purity: 0.900, description: '0.1152 toz AGW' },
    { name: 'German 5 Mark', weightGrams: 1.991, purity: 0.900, description: '0.0576 toz AGW' },
    
    // Dutch Gold Coins
    { name: 'Dutch 10 Guilder', weightGrams: 6.729, purity: 0.900, description: '0.1947 toz AGW' },
    { name: 'Dutch Ducat', weightGrams: 3.494, purity: 0.9838, description: '0.1104 toz AGW' },
    
    // Italian Gold Coins
    { name: 'Italian 20 Lira', weightGrams: 6.451, purity: 0.900, description: '0.1867 toz AGW' },
    
    // Belgian Gold Coins
    { name: 'Belgian 20 Franc', weightGrams: 6.451, purity: 0.900, description: '0.1867 toz AGW' },
    
    // Russian/Soviet Gold Coins
    { name: 'Russian 5 Roubles (Chervonets)', weightGrams: 4.301, purity: 0.900, description: '0.1244 toz AGW' },
    { name: 'Russian 10 Roubles', weightGrams: 8.603, purity: 0.900, description: '0.2489 toz AGW' },
    
    // Turkish Gold Coins
    { name: 'Turkish 100 Kurush', weightGrams: 7.216, purity: 0.9167, description: '0.2127 toz AGW' },
    { name: 'Turkish 50 Kurush', weightGrams: 3.608, purity: 0.9167, description: '0.1063 toz AGW' },
    { name: 'Turkish 25 Kurush', weightGrams: 1.804, purity: 0.9167, description: '0.0532 toz AGW' },
    
    // Hungarian Gold Coins
    { name: 'Hungarian 100 Corona', weightGrams: 33.875, purity: 0.900, description: '0.9802 toz AGW' },
    { name: 'Hungarian 20 Corona', weightGrams: 6.775, purity: 0.900, description: '0.1960 toz AGW' },
    
    // Bars - Standard Sizes
    { name: 'Gold Bar', weightGrams: 31.103, purity: 0.9999, description: '1 toz' },
    { name: 'Gold Bar', weightGrams: 15.552, purity: 0.9999, description: '1/2 toz' },
    { name: 'Gold Bar', weightGrams: 7.776, purity: 0.9999, description: '1/4 toz' },
    { name: 'Gold Bar', weightGrams: 3.110, purity: 0.9999, description: '1/10 toz' },
    { name: 'Gold Bar', weightGrams: 155.515, purity: 0.9999, description: '5 toz' },
    { name: 'Gold Bar', weightGrams: 311.030, purity: 0.9999, description: '10 toz' },
    { name: 'Gold Bar', weightGrams: 1000.0, purity: 0.9999, description: '1 kilogram' },
    { name: 'Gold Bar (London Good Delivery)', weightGrams: 12500.0, purity: 0.9999, description: '~400 toz' },
    
    // Premium Bars - Specific Refiners
    { name: 'Perth Mint Gold Bar', weightGrams: 31.103, purity: 0.9999, description: '1 toz' },
    { name: 'PAMP Suisse Gold Bar', weightGrams: 31.103, purity: 0.9999, description: '1 toz' },
    { name: 'PAMP Suisse Gold Bar', weightGrams: 100.0, purity: 0.9999, description: '100 gram' },
    { name: 'Credit Suisse Gold Bar', weightGrams: 31.103, purity: 0.9999, description: '1 toz' },
    { name: 'Credit Suisse Gold Bar', weightGrams: 100.0, purity: 0.9999, description: '100 gram' },
    { name: 'Valcambi Gold Bar', weightGrams: 31.103, purity: 0.9999, description: '1 toz' },
    { name: 'Valcambi Gold CombiBar', weightGrams: 50.0, purity: 0.9999, description: '50 x 1g' },
    { name: 'Johnson Matthey Gold Bar', weightGrams: 31.103, purity: 0.9999, description: '1 toz' },
    { name: 'Engelhard Gold Bar', weightGrams: 31.103, purity: 0.9999, description: '1 toz' },
    
    // Small Gram Bars
    { name: 'Gold Bar', weightGrams: 1.0, purity: 0.9999, description: '1 gram' },
    { name: 'Gold Bar', weightGrams: 2.5, purity: 0.9999, description: '2.5 grams' },
    { name: 'Gold Bar', weightGrams: 5.0, purity: 0.9999, description: '5 grams' },
    { name: 'Gold Bar', weightGrams: 10.0, purity: 0.9999, description: '10 grams' },
    { name: 'Gold Bar', weightGrams: 20.0, purity: 0.9999, description: '20 grams' },
    { name: 'Gold Bar', weightGrams: 50.0, purity: 0.9999, description: '50 grams' },
    { name: 'Gold Bar', weightGrams: 100.0, purity: 0.9999, description: '100 grams' },
    { name: 'Gold Bar', weightGrams: 250.0, purity: 0.9999, description: '250 grams' },
    { name: 'Gold Bar', weightGrams: 500.0, purity: 0.9999, description: '500 grams' },
];

export const SILVER_COIN_DATABASE: CoinSpec[] = [
    // US Coins
    { name: 'Morgan Dollar', weightGrams: 26.73, purity: 0.900, description: '1878-1921' },
    { name: 'Peace Dollar', weightGrams: 26.73, purity: 0.900, description: '1921-1935' },
    { name: 'Kennedy Half Dollar', weightGrams: 11.50, purity: 0.400, description: '1965-1970' },
    { name: 'Kennedy Half Dollar', weightGrams: 12.50, purity: 0.900, description: '1964' },
    { name: 'Kennedy Half Dollar', weightGrams: 11.50, purity: 0.400, description: '1976 S (40% silver)', mints: ['S'] },
    { name: 'Kennedy Half Dollar', weightGrams: 12.50, purity: 0.900, description: '1992-2018 S (silver proof)', mints: ['S'] },
    { name: 'Kennedy Half Dollar', weightGrams: 12.685, purity: 0.999, description: '2019+ S (silver proof)', mints: ['S'] },
    { name: 'Kennedy Half Dollar', weightGrams: 11.34, purity: 0, description: '1971+ P/D (copper-nickel)', mints: ['P', 'D'] },
    { name: 'Walking Liberty Half', weightGrams: 12.50, purity: 0.900, description: '1916-1947' },
    { name: 'Franklin Half Dollar', weightGrams: 12.50, purity: 0.900, description: '1948-1963' },
    { name: 'Washington Quarter', weightGrams: 6.25, purity: 0.900, description: '1932-1964' },
    { name: 'Washington Quarter', weightGrams: 5.75, purity: 0.400, description: '1976 S (40% silver)', mints: ['S'] },
    { name: 'Washington Quarter', weightGrams: 6.25, purity: 0.900, description: '1992-2018 S (silver proof)', mints: ['S'] },
    { name: 'Washington Quarter', weightGrams: 6.343, purity: 0.999, description: '2019+ S (silver proof)', mints: ['S'] },
    { name: 'Washington Quarter', weightGrams: 5.67, purity: 0, description: '1965+ P/D (copper-nickel)', mints: ['P', 'D'] },
    { name: 'Standing Liberty Quarter', weightGrams: 6.25, purity: 0.900, description: '1916-1930' },
    { name: 'Mercury Dime', weightGrams: 2.50, purity: 0.900, description: '1916-1945' },
    { name: 'Roosevelt Dime', weightGrams: 2.50, purity: 0.900, description: '1946-1964' },
    { name: 'Roosevelt Dime', weightGrams: 2.50, purity: 0.900, description: '1992-2018 S (silver proof)', mints: ['S'] },
    { name: 'Roosevelt Dime', weightGrams: 2.537, purity: 0.999, description: '2019+ S (silver proof)', mints: ['S'] },
    { name: 'Roosevelt Dime', weightGrams: 2.268, purity: 0, description: '1965+ P/D (copper-nickel)', mints: ['P', 'D'] },
    { name: 'Barber Dime', weightGrams: 2.50, purity: 0.900, description: '1892-1916' },
    { name: 'Barber Quarter', weightGrams: 6.25, purity: 0.900, description: '1892-1916' },
    { name: 'Barber Half Dollar', weightGrams: 12.50, purity: 0.900, description: '1892-1915' },
    { name: 'Seated Liberty Dime', weightGrams: 2.50, purity: 0.900, description: '1837-1891' },
    { name: 'Seated Liberty Quarter', weightGrams: 6.25, purity: 0.900, description: '1838-1891' },
    { name: 'Seated Liberty Half Dollar', weightGrams: 12.50, purity: 0.900, description: '1839-1891' },
    { name: 'Seated Liberty Dollar', weightGrams: 26.73, purity: 0.900, description: '1840-1873' },
    // War nickels carry a large P, D, or S above Monticello's dome; 1942-D and early 1942 are regular nickels.
    { name: 'Jefferson Nickel (War Nickel)', weightGrams: 5.00, purity: 0.350, description: '1942-1945 (35% silver, large mint mark above dome)', mints: ['P', 'D', 'S'] },
    { name: 'Jefferson Nickel', weightGrams: 5.00, purity: 0, description: '1938-1942 (copper-nickel, incl. 1942-D)' },
    { name: 'Jefferson Nickel', weightGrams: 5.00, purity: 0, description: '1946+ (copper-nickel)' },
    // Circulating P and D Ikes are copper-nickel; only the S collector strikes carry silver.
    { name: 'Eisenhower Dollar', weightGrams: 24.59, purity: 0.400, description: '1971-1976 S (40% silver)', mints: ['S'] },
    { name: 'Eisenhower Dollar', weightGrams: 22.68, purity: 0, description: '1971-1978 P/D (copper-nickel)', mints: ['P', 'D'] },
    { name: 'Trade Dollar', weightGrams: 27.22, purity: 0.900, description: '1873-1885' },
    { name: 'Susan B. Anthony Dollar', weightGrams: 8.10, purity: 0, description: '1979-1999 (copper-nickel)' },
    { name: 'Sacagawea / Native American Dollar', weightGrams: 8.10, purity: 0, description: '2000+ (manganese brass)' },
    
    // Canadian Coins
    { name: 'Canadian Silver Dollar', weightGrams: 23.33, purity: 0.800, description: '1935-1967' },
    { name: 'Canadian Half Dollar', weightGrams: 11.66, purity: 0.800, description: '1920-1967' },
    { name: 'Canadian Quarter', weightGrams: 5.83, purity: 0.800, description: '1920-1967' },
    { name: 'Canadian Quarter', weightGrams: 5.83, purity: 0.500, description: '1967-1968 (50% silver)' },
    { name: 'Canadian Dime', weightGrams: 2.33, purity: 0.800, description: '1920-1967' },
    { name: 'Canadian Dime', weightGrams: 2.33, purity: 0.500, description: '1967-1968 (50% silver)' },
    { name: 'Canadian Silver Nickel', weightGrams: 4.60, purity: 0.800, description: '1920-1921' },
    
    // US Bullion - American Silver Eagle
    { name: 'American Silver Eagle', weightGrams: 31.103, purity: 0.999, description: '1 toz', years: { from: 1986 } },
    
    // Canadian Bullion - Maple Leaf
    { name: 'Canadian Maple Leaf', weightGrams: 31.103, purity: 0.9999, description: '1 toz', years: { from: 1988 } },
    { name: 'Canadian Maple Leaf', weightGrams: 15.552, purity: 0.9999, description: '1/2 toz' },
    { name: 'Canadian Maple Leaf', weightGrams: 311.030, purity: 0.9999, description: '10 toz' },
    
    // Austrian Bullion - Philharmonic
    { name: 'Austrian Philharmonic', weightGrams: 31.103, purity: 0.999, description: '1 toz', years: { from: 2008 } },
    { name: 'Austrian Philharmonic', weightGrams: 15.552, purity: 0.999, description: '1/2 toz' },
    
    // Mexican Bullion - Libertad (all denominations)
    { name: 'Mexican Libertad', weightGrams: 155.515, purity: 0.999, description: '5 toz' },
    { name: 'Mexican Libertad', weightGrams: 62.206, purity: 0.999, description: '2 toz' },
    { name: 'Mexican Libertad', weightGrams: 31.103, purity: 0.999, description: '1 toz', years: { from: 1982 } },
    { name: 'Mexican Libertad', weightGrams: 15.552, purity: 0.999, description: '1/2 toz' },
    { name: 'Mexican Libertad', weightGrams: 7.776, purity: 0.999, description: '1/4 toz' },
    { name: 'Mexican Libertad', weightGrams: 3.110, purity: 0.999, description: '1/10 toz' },
    { name: 'Mexican Libertad', weightGrams: 1.555, purity: 0.999, description: '1/20 toz' },
    { name: 'Mexican Libertad Kilo', weightGrams: 1000.0, purity: 0.999, description: '1 kilogram' },
    
    // Chinese Bullion - Panda
    { name: 'Chinese Silver Panda', weightGrams: 31.103, purity: 0.999, description: '1 toz (current)', years: { from: 1989, to: 2015 } },
    { name: 'Chinese Silver Panda', weightGrams: 30.0, purity: 0.999, description: '30g (2016+)' },
    
    // Australian Bullion - Kookaburra
    { name: 'Australian Kookaburra', weightGrams: 31.103, purity: 0.999, description: '1 toz', years: { from: 1990 } },
    { name: 'Australian Kookaburra Kilo', weightGrams: 1000.0, purity: 0.999, description: '1 kilogram' },
    
    // Australian Bullion - Kangaroo/Nugget
    { name: 'Australian Kangaroo', weightGrams: 31.103, purity: 0.9999, description: '1 toz', years: { from: 2016 } },
    
    // Australian Bullion - Lunar Series
    { name: 'Australian Lunar Series', weightGrams: 31.103, purity: 0.999, description: '1 toz', years: { from: 1999 } },
    { name: 'Australian Lunar Series Kilo', weightGrams: 1000.0, purity: 0.999, description: '1 kilogram' },
    
    // British Bullion - Britannia
    { name: 'British Britannia', weightGrams: 31.103, purity: 0.999, description: '1 toz', years: { from: 1997 } },
    
    // South African Bullion - Krugerrand
    { name: 'South African Silver Krugerrand', weightGrams: 31.103, purity: 0.999, description: '1 toz', years: { from: 2017 } },
    
    // British Pre-Decimal Coins
    { name: 'British Crown', weightGrams: 28.28, purity: 0.925, description: 'Pre-1947' },
    { name: 'British Half Crown', weightGrams: 14.14, purity: 0.925, description: 'Pre-1947' },
    { name: 'British Shilling', weightGrams: 5.66, purity: 0.925, description: 'Pre-1947' },
    { name: 'British Sixpence', weightGrams: 2.83, purity: 0.925, description: 'Pre-1947' },
    { name: 'British Threepence', weightGrams: 1.41, purity: 0.925, description: 'Pre-1947' },
    
    // British Modern
    { name: 'British Sovereign (Silver)', weightGrams: 28.28, purity: 0.925, description: 'Various years' },
    
    // European Coins
    { name: 'French 5 Francs', weightGrams: 25.0, purity: 0.900, description: '1960-1969 (Hercules)' },
    { name: 'German 5 Mark', weightGrams: 13.89, purity: 0.900, description: '1951-1974' },
    { name: 'Swiss 5 Francs', weightGrams: 15.0, purity: 0.835, description: '1931-1969' },
    { name: 'Dutch Guilder', weightGrams: 10.0, purity: 0.720, description: 'Various dates' },
    
    // Historical Mexican
    { name: 'Mexican Silver Peso', weightGrams: 27.07, purity: 0.903, description: '1920-1945' },
    { name: 'Mexican Onza', weightGrams: 33.625, purity: 0.925, description: '1949-1980' },

    // Asian Coins
    { name: 'Hong Kong 10 Cents', weightGrams: 2.72, purity: 0.800, description: '1863-1905 (Queen Victoria)' },
    { name: 'Japan 10 Sen', weightGrams: 2.70, purity: 0.800, description: '1873-1906 (Meiji, dragon)' },
    { name: 'Japan 10 Sen', weightGrams: 2.25, purity: 0.720, description: '1907-1917 (Meiji 40 - Taisho 6)' },
    { name: 'Japan 50 Sen', weightGrams: 4.95, purity: 0.720, description: '1922-1938 (Taisho 11 - Showa 13)' },
    { name: 'Japan 100 Yen', weightGrams: 4.80, purity: 0.600, description: '1957-1958 (phoenix)' },
    { name: 'Japan 100 Yen', weightGrams: 4.80, purity: 0.600, description: '1959-1966 (rice stalks)' },
    
    // Libertad Sets (for convenience)
    { name: 'Mexican Libertad Set (6 coins)', weightGrams: 121.302, purity: 0.999, description: '2 oz + 1 oz + 1/2 oz + 1/4 oz + 1/10 oz + 1/20 oz' },
    { name: 'Mexican Libertad Set (7 coins)', weightGrams: 276.817, purity: 0.999, description: '5 oz + 2 oz + 1 oz + 1/2 oz + 1/4 oz + 1/10 oz + 1/20 oz' },
    
    // Generic Rounds
    { name: 'Generic Silver Round', weightGrams: 31.103, purity: 0.999, description: '1 toz' },
    { name: 'Generic Silver Round', weightGrams: 15.552, purity: 0.999, description: '1/2 toz' },
    { name: 'Generic Silver Round', weightGrams: 155.515, purity: 0.999, description: '5 toz' },
    
    // Generic Bars - Standard Sizes
    { name: 'Generic Silver Bar', weightGrams: 31.103, purity: 0.999, description: '1 toz' },
    { name: 'Generic Silver Bar', weightGrams: 155.515, purity: 0.999, description: '5 toz' },
    { name: 'Generic Silver Bar', weightGrams: 311.030, purity: 0.999, description: '10 toz' },
    { name: 'Generic Silver Bar', weightGrams: 3110.300, purity: 0.999, description: '100 toz' },
    { name: 'Generic Silver Bar', weightGrams: 31103.000, purity: 0.999, description: '1000 toz' },
    { name: 'Generic Silver Bar Kilo', weightGrams: 1000.0, purity: 0.999, description: '1 kilogram' },
    
    // Commemorative/Special
    { name: 'US Commemorative Half Dollar', weightGrams: 12.50, purity: 0.900, description: 'Various years' },
    { name: 'US Commemorative Dollar', weightGrams: 26.73, purity: 0.900, description: 'Various years' },
];