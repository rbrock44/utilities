import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { COIN_OPTIONS, CoinStackCalculatorComponent, pureTozPerCoin } from './coin-stack-calculator';
import { SpotPriceService } from '../../../services/spot-price';

const morganId = COIN_OPTIONS.find(c => c.spec.name === 'Morgan Dollar')!.id;
const eagleId = COIN_OPTIONS.find(c => c.spec.name === 'American Gold Eagle')!.id;

describe('COIN_OPTIONS', () => {
  it('should hold every gold and silver coin with a unique id', () => {
    const ids = COIN_OPTIONS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(COIN_OPTIONS.some(c => c.metal === 'gold')).toBe(true);
    expect(COIN_OPTIONS.some(c => c.metal === 'silver')).toBe(true);
  });

  it('should tell the two Kennedy halves apart by year', () => {
    const kennedys = COIN_OPTIONS.filter(c => c.spec.name === 'Kennedy Half Dollar').map(c => c.label);
    expect(kennedys).toEqual(['Kennedy Half Dollar · 1965-1970', 'Kennedy Half Dollar · 1964']);
  });

  it('should compute pure troy ounces from weight and purity', () => {
    // 26.73 g × 0.900 = 24.057 g pure / 31.1035 = 0.77345 oz t.
    expect(pureTozPerCoin(COIN_OPTIONS.find(c => c.id === morganId)!.spec)).toBeCloseTo(0.77345, 5);
  });
});

describe('CoinStackCalculatorComponent', () => {
  let component: CoinStackCalculatorComponent;
  let fixture: ComponentFixture<CoinStackCalculatorComponent>;

  const setup = async (gold: number, silver: number) => {
    await TestBed.configureTestingModule({
      imports: [CoinStackCalculatorComponent],
      providers: [{ provide: SpotPriceService, useValue: { getSpotPrices: () => of({ gold, silver, timestamp: new Date() }) } }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoinStackCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('should start empty with live spot prices filled in', async () => {
    await setup(2000, 30);

    expect(component.rows).toEqual([]);
    expect(component.spotGold).toBe(2000);
    expect(component.spotSilver).toBe(30);
    expect(component.pricesFailed).toBe(false);
    expect(component.meltValue).toBeNull();
  });

  it('should ask for prices when the live fetch fails', async () => {
    await setup(-1, -1);

    expect(component.pricesFailed).toBe(true);
    expect(component.spotGold).toBeNull();

    component.addCoin(morganId);
    expect(component.errorMessage).toBe('Enter a silver spot price to value the silver coins.');

    component.spotSilver = 30;
    expect(component.errorMessage).toBeNull();
  });

  it('should add a coin, and add one more when it is picked again', async () => {
    await setup(2000, 30);

    component.addCoin(morganId);
    component.addCoin(morganId);
    component.addCoin('nope');

    expect(component.rows.length).toBe(1);
    expect(component.rows[0].quantity).toBe(2);
  });

  it('should value a mixed stack at melt and at the dealer percentage', async () => {
    await setup(2000, 30);
    component.addCoin(morganId);
    component.rows[0].quantity = 10;
    component.addCoin(eagleId);

    // 10 Morgans: 7.7345 oz t × $30 = $232.03. One 1 oz Eagle: 1.0000 oz t × $2000.
    expect(component.silverToz).toBeCloseTo(7.7345, 4);
    expect(component.goldToz).toBeCloseTo(1.0000, 3);
    expect(component.meltValue).toBeCloseTo(232.03 + 2000.07, 1);
    expect(component.dealerValue).toBeCloseTo(component.meltValue! * 0.9, 6);
    expect(component.coinCount).toBe(11);
  });

  it('should only require a spot price for metals in the stack', async () => {
    await setup(2000, 30);
    component.spotGold = null;
    component.addCoin(morganId);

    expect(component.errorMessage).toBeNull();

    component.addCoin(eagleId);
    expect(component.errorMessage).toBe('Enter a gold spot price to value the gold coins.');
  });

  it('should validate quantities and the dealer percentage', async () => {
    await setup(2000, 30);
    component.addCoin(morganId);

    component.rows[0].quantity = 1.5;
    expect(component.errorMessage).toBe('Quantities must be whole numbers, 0 or more.');
    expect(component.meltValue).toBeNull();
    component.rows[0].quantity = 1;

    component.dealerPercent = 120;
    expect(component.errorMessage).toBe('Dealer offer must be between 0% and 100%.');
  });

  it('should remove rows and clear the stack', async () => {
    await setup(2000, 30);
    component.addCoin(morganId);
    component.addCoin(eagleId);

    component.removeRow(component.rows[0]);
    expect(component.rows.map(r => r.coin.id)).toEqual([eagleId]);

    component.clear();
    expect(component.rows).toEqual([]);
  });

  it('should format money and ounces', async () => {
    await setup(2000, 30);
    expect(component.money(null)).toBe('—');
    expect(component.money(1234.5)).toContain('1,234.50');
    expect(component.toz(0.77346)).toBe('0.7735 oz t');
  });
});
