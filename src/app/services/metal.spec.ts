import { TestBed } from '@angular/core/testing';

import { MetalService } from './metal';
import { TROY_OZ_IN_GRAMS } from '../constants/constants';

describe('MetalService', () => {
  let service: MetalService;

  const spotPrices: SpotPrices = {
    gold: 2000,
    silver: 25,
    timestamp: new Date()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should value gold by pure troy ounces at spot', () => {
    const rows: MetalRow[] = [{ id: 1, type: '24K Gold (99.9%)', weight: 1, unit: 'toz' }];

    const result = service.calculateGoldPrice(spotPrices, rows);

    expect(result.breakdowns.length).toBe(1);
    expect(result.totals.totalPureToz).toBeCloseTo(0.999, 5);
    expect(result.totals.spotValue).toBeCloseTo(0.999 * 2000, 5);
  });

  it('should carry a trimmed note into the breakdown and leave blank notes out', () => {
    const rows: MetalRow[] = [
      { id: 1, type: '14K Gold (58.3%)', weight: 4.2, unit: 'grams', note: '  nugget ring ' },
      { id: 2, type: '10K Gold (41.7%)', weight: 3, unit: 'grams', note: '   ' },
    ];

    const result = service.calculateGoldPrice(spotPrices, rows);

    expect(result.breakdowns[0].note).toBe('nugget ring');
    expect('note' in result.breakdowns[1]).toBe(false);
  });

  it('should value a custom silver row at its own percent and name it after the percent', () => {
    const rows: MetalRow[] = [{ id: 1, type: 'Custom %', purity: 70, weight: 1, unit: 'toz' }];

    const result = service.calculateSilverPrice(spotPrices, rows);

    expect(result.breakdowns[0].type).toBe('Silver 70%');
    expect(result.totals.totalPureToz).toBeCloseTo(0.7, 5);
    expect(result.totals.spotValue).toBeCloseTo(0.7 * 25, 5);
  });

  it('should skip a custom silver row until it has a valid percent, and never treat gold as custom', () => {
    const silver: MetalRow[] = [
      { id: 1, type: 'Custom %', weight: 1, unit: 'toz' },
      { id: 2, type: 'Custom %', purity: 150, weight: 1, unit: 'toz' },
    ];
    expect(service.calculateSilverPrice(spotPrices, silver).breakdowns).toEqual([]);

    const gold: MetalRow[] = [{ id: 1, type: 'Custom %', purity: 70, weight: 1, unit: 'toz' }];
    expect(service.calculateGoldPrice(spotPrices, gold).breakdowns).toEqual([]);
  });

  it('should convert grams to troy ounces', () => {
    const rows: MetalRow[] = [
      { id: 1, type: 'Fine Silver (99.9%)', weight: TROY_OZ_IN_GRAMS, unit: 'grams' }
    ];

    const result = service.calculateSilverPrice(spotPrices, rows);

    expect(result.totals.totalWeightToz).toBeCloseTo(1, 5);
    expect(result.totals.totalPureToz).toBeCloseTo(0.999, 5);
  });

  it('should apply purity when calculating pure weight', () => {
    const rows: MetalRow[] = [{ id: 1, type: '14K Gold (58.3%)', weight: 10, unit: 'grams' }];

    const result = service.calculateGoldPrice(spotPrices, rows);

    expect(result.totals.totalWeightGrams).toBeCloseTo(10, 5);
    expect(result.totals.totalPureGrams).toBeCloseTo(5.83, 5);
  });

  it('should discount the spot value at 90, 80 and 70 percent', () => {
    const rows: MetalRow[] = [{ id: 1, type: '24K Gold (99.9%)', weight: 1, unit: 'toz' }];

    const result = service.calculateGoldPrice(spotPrices, rows);
    const spot = result.totals.spotValue;

    expect(result.totals.value90).toBeCloseTo(spot * 0.9, 5);
    expect(result.totals.value80).toBeCloseTo(spot * 0.8, 5);
    expect(result.totals.value70).toBeCloseTo(spot * 0.7, 5);
  });

  it('should skip rows with no weight and unknown metal types', () => {
    const rows: MetalRow[] = [
      { id: 1, type: '24K Gold (99.9%)', weight: 0, unit: 'toz' },
      { id: 2, type: 'Not A Real Metal', weight: 5, unit: 'grams' }
    ];

    const result = service.calculateGoldPrice(spotPrices, rows);

    expect(result.breakdowns.length).toBe(0);
    expect(result.totals.spotValue).toBe(0);
  });

  it('should total multiple rows together', () => {
    const rows: MetalRow[] = [
      { id: 1, type: '24K Gold (99.9%)', weight: 1, unit: 'toz' },
      { id: 2, type: '18K Gold (75%)', weight: 1, unit: 'toz' }
    ];

    const result = service.calculateGoldPrice(spotPrices, rows);

    expect(result.breakdowns.length).toBe(2);
    expect(result.totals.totalWeightToz).toBeCloseTo(2, 5);
    expect(result.totals.totalPureToz).toBeCloseTo(0.999 + 0.75, 5);
  });
});
