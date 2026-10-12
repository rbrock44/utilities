import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import {
  COIN_OPTIONS,
  CoinStackCalculatorComponent,
  decodeStack,
  encodeStack,
  pureTozPerCoin,
} from './coin-stack-calculator';
import { SpotPriceService } from '../../../services/spot-price';
import { jsPDF } from 'jspdf';
import { buildCoinQuote } from './coin-quote';

const morganId = COIN_OPTIONS.find(c => c.spec.name === 'Morgan Dollar')!.id;
const eagleId = COIN_OPTIONS.find(c => c.spec.name === 'American Gold Eagle')!.id;

describe('COIN_OPTIONS', () => {
  it('should hold every gold and silver coin with a unique id', () => {
    const ids = COIN_OPTIONS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(COIN_OPTIONS.some(c => c.metal === 'gold')).toBe(true);
    expect(COIN_OPTIONS.some(c => c.metal === 'silver')).toBe(true);
  });

  it('should use stable slug ids built from metal, name, and dates', () => {
    expect(morganId).toBe('silver-morgan-dollar-1878-1921');
    expect(eagleId).toBe('gold-american-gold-eagle-1-oz-22k');
    expect(COIN_OPTIONS.every(c => /^(gold|silver)-[a-z0-9-]+$/.test(c.id))).toBe(true);
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

describe('stack links', () => {
  it('should round-trip a stack through the link format', () => {
    const items = [{ id: morganId, quantity: 10 }, { id: eagleId, quantity: 1 }];
    const encoded = encodeStack(items);

    expect(encoded).toBe(`${morganId}~10_${eagleId}~1`);
    expect(encodeURIComponent(encoded)).toBe(encoded);
    expect(decodeStack(encoded)).toEqual({ items, skipped: 0 });
  });

  it('should carry notes, even ones with link separators, and still read links without them', () => {
    const items = [{ id: morganId, quantity: 2, note: '1941 ~ from grandpa_jar & co' }, { id: eagleId, quantity: 1 }];
    const encoded = encodeStack(items);

    expect(encoded.split('_').length).toBe(2);
    expect(decodeStack(encoded)).toEqual({ items, skipped: 0 });
    expect(decodeStack(`${morganId}~2~%E0%A4%A`)).toEqual({ items: [{ id: morganId, quantity: 2 }], skipped: 0 });
  });

  it('should skip unknown coins and bad quantities but keep the rest', () => {
    const decoded = decodeStack(`${morganId}~3_gold-not-a-coin~1_${eagleId}~0_${eagleId}~1.5_${eagleId}~abc_`);
    expect(decoded).toEqual({ items: [{ id: morganId, quantity: 3 }], skipped: 4 });
  });
});

describe('CoinStackCalculatorComponent', () => {
  let component: CoinStackCalculatorComponent;
  let fixture: ComponentFixture<CoinStackCalculatorComponent>;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const setup = async (gold: number, silver: number, query: Record<string, string> = {}) => {
    await TestBed.configureTestingModule({
      imports: [CoinStackCalculatorComponent],
      providers: [
        { provide: SpotPriceService, useValue: { getSpotPrices: () => of({ gold, silver, timestamp: new Date() }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      ]
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

  it('should load a shared stack and its name from the link', async () => {
    await setup(2000, 30, { stack: `${morganId}~10_${eagleId}~1`, name: 'Grandpa' });

    expect(component.rows.map(r => [r.coin.id, r.quantity])).toEqual([[morganId, 10], [eagleId, 1]]);
    expect(component.stackName).toBe('Grandpa');
    expect(component.linkNotice).toBe('Loaded a shared stack of 2 coin types.');
  });

  it('should say how much of a shared link it could not read', async () => {
    await setup(2000, 30, { stack: `${morganId}~1_gold-gone~2` });

    expect(component.rows.length).toBe(1);
    expect(component.linkNotice).toBe('Loaded a shared stack of 1 coin type. 1 entry in the link wasn\'t recognized.');
  });

  it('should leave zero-quantity rows out of links and saves', async () => {
    await setup(2000, 30);
    component.addCoin(morganId);
    component.addCoin(eagleId);
    component.rows[1].quantity = 0;

    expect(component.items).toEqual([{ id: morganId, quantity: 1 }]);
    expect(component.shareValue).toBe(`${morganId}~1`);
  });

  it('should have nothing to save or share until a coin is added', async () => {
    await setup(2000, 30);
    expect(component.itemsOrNull).toBeNull();
    expect(component.shareValue).toBeNull();

    component.addCoin(morganId);
    expect(component.itemsOrNull).toEqual([{ id: morganId, quantity: 1 }]);
  });

  it('should save, reload, and delete a stack through the panel', async () => {
    await setup(2000, 30);
    component.addCoin(morganId);
    component.rows[0].quantity = 7;
    component.stackName = 'Morgans';
    fixture.detectChanges();

    const panel = () => fixture.nativeElement as HTMLElement;
    const click = (label: string) => {
      const button = Array.from(panel().querySelectorAll('app-save-share button'))
        .find(b => b.textContent?.trim() === label || b.getAttribute('aria-label') === label) as HTMLButtonElement;
      button.click();
      fixture.detectChanges();
    };

    click('Save');
    expect(component.savedStacks.lists().map(l => l.name)).toEqual(['Morgans']);
    expect(JSON.parse(store['utilities-coin-stacks'])[0].items).toEqual([{ id: morganId, quantity: 7 }]);
    expect(panel().textContent).toContain('7 coins');

    component.clear();
    const nameInput = panel().querySelector('#saveShareName') as HTMLInputElement;
    nameInput.value = 'Something else';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.stackName).toBe('Something else');

    click('Load Morgans');
    expect(component.rows.map(r => r.quantity)).toEqual([7]);
    expect(component.stackName).toBe('Morgans');

    click('Delete Morgans');
    expect(component.savedStacks.lists()).toEqual([]);
  });

  describe('notes', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const render = () => { fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck(); fixture.detectChanges(); };
    const toggle = () => el().querySelector('.note-toggle') as HTMLButtonElement;

    it('should keep an empty note hidden until toggled, and lock open once it has text', async () => {
      await setup(2000, 30);
      component.addCoin(morganId);
      render();

      expect(el().querySelector('.note-input')).toBeNull();
      expect(toggle().textContent!.trim()).toBe('+ note');

      toggle().click();
      render();
      expect(el().querySelector('.note-input')).toBeTruthy();
      expect(toggle().textContent!.trim()).toBe('− note');

      toggle().click();
      render();
      expect(el().querySelector('.note-input')).toBeNull();

      component.rows[0].note = 'from grandpa';
      render();
      expect(el().querySelector('.note-input')).toBeTruthy();
      expect(toggle().disabled).toBe(true);
      component.toggleNote(component.rows[0]);
      render();
      expect(el().querySelector('.note-input')).toBeTruthy();
    });

    it('should save and share trimmed notes and leave blank ones out', async () => {
      await setup(2000, 30);
      component.addCoin(morganId);
      component.addCoin(eagleId);
      component.rows[0].quantity = 2;
      component.rows[0].note = '  1941, from grandpa  ';
      component.rows[1].note = '   ';

      expect(component.items).toEqual([
        { id: morganId, quantity: 2, note: '1941, from grandpa' },
        { id: eagleId, quantity: 1 },
      ]);
      expect(decodeStack(component.shareValue!).items).toEqual(component.items);
    });

    it('should show notes from a shared link and from a loaded save', async () => {
      store['utilities-coin-stacks'] = JSON.stringify([
        { name: 'Jar', items: [{ id: eagleId, quantity: 1, note: 'birthday' }], savedAt: '2026-10-01T00:00:00.000Z' },
      ]);
      await setup(2000, 30, { stack: encodeStack([{ id: morganId, quantity: 2, note: 'from grandpa' }]) });
      await fixture.whenStable();

      expect(component.rows[0].note).toBe('from grandpa');
      expect((el().querySelector('.note-input') as HTMLInputElement).value).toBe('from grandpa');

      (el().querySelector('[aria-label="Load Jar"]') as HTMLButtonElement).click();
      render();
      await fixture.whenStable();

      expect(component.items).toEqual([{ id: eagleId, quantity: 1, note: 'birthday' }]);
      expect((el().querySelector('.note-input') as HTMLInputElement).value).toBe('birthday');
    });

    it('should drop saved stacks whose notes are not text', async () => {
      store['utilities-coin-stacks'] = JSON.stringify([
        { name: 'Bad', items: [{ id: morganId, quantity: 1, note: 5 }], savedAt: '2026-10-01T00:00:00.000Z' },
      ]);
      await setup(2000, 30);

      expect(component.savedStacks.lists()).toEqual([]);
    });
  });

  describe('quote', () => {
    it('should have no quote until the stack can be valued', async () => {
      await setup(-1, -1);
      expect(component.quote).toBeNull();

      component.addCoin(morganId);
      expect(component.quote).toBeNull();
    });

    it('should build the quote from each row, its note, and the stack totals', async () => {
      await setup(2000, 30);
      component.addCoin(morganId);
      component.addCoin(eagleId);
      component.rows[0].quantity = 10;
      component.rows[0].note = ' from grandpa ';
      component.stackName = 'Jar';
      const morganToz = pureTozPerCoin(COIN_OPTIONS.find(c => c.id === morganId)!.spec);

      const quote = component.quote!;

      expect(quote.name).toBe('Jar');
      expect(quote.rows[0]).toEqual({
        label: COIN_OPTIONS.find(c => c.id === morganId)!.label,
        metal: 'silver',
        quantity: 10,
        pureToz: morganToz * 10,
        melt: morganToz * 10 * 30,
        note: 'from grandpa',
      });
      expect('note' in quote.rows[1]).toBe(false);
      expect(quote.melt).toBe(component.meltValue);
      expect(quote.dealer).toBe(component.dealerValue);
    });
  });
});

describe('coin quote pdf', () => {
  it('should list coins by metal with quantities, notes, totals, and the dealer offer', () => {
    const pdf = buildCoinQuote(jsPDF, {
      name: '',
      date: new Date('2026-10-12T15:00:00Z'),
      spotGold: 2000,
      spotSilver: null,
      dealerPercent: 90,
      rows: [
        { label: 'Morgan Dollar · 1878-1921', metal: 'silver', quantity: 2, pureToz: 1.5469, melt: 46.41, note: '1941, from grandpa' },
        { label: 'Peace Dollar', metal: 'silver', quantity: 0, pureToz: 0, melt: 0 },
      ],
      melt: 46.41,
      dealer: 41.77,
    }).output();

    expect(pdf).toContain('(Coin Stack Quote)');
    expect(pdf).toContain('Gold $2,000.00/oz t');
    expect(pdf).toContain('(Morgan Dollar');
    expect(pdf).toContain('(1941, from grandpa)');
    expect(pdf).toContain('(2 coins)');
    expect(pdf).toContain('($46.41)');
    expect(pdf).toContain('(Dealer offer at 90%)');
    expect(pdf).toContain('($41.77)');
    expect(pdf).not.toContain('(Peace Dollar)');
    expect(pdf).not.toContain('(Gold coins)');
  });
});
