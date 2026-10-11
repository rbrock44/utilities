import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';

import { PreciousMetalsComponent } from './precious-metals';
import { goldTypes, silverTypes } from '../../../constants/constants';
import { SpotPriceService } from '../../../services/spot-price';
import { encodeMetalList, encodeSpotPrices, MetalListItem } from './metal-list';

describe('PreciousMetalsComponent', () => {
  let component: PreciousMetalsComponent;
  let fixture: ComponentFixture<PreciousMetalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreciousMetalsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreciousMetalsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('removes a gold row when there is more than one', () => {
    component.addGoldRow();
    const keep = component.goldRows[1];
    component.removeGoldRow(component.goldRows[0].id);
    expect(component.goldRows).toEqual([keep]);
  });

  it('resets the only gold row to defaults instead of removing it', () => {
    const row = component.goldRows[0];
    row.type = goldTypes[goldTypes.length - 1].name;
    row.weight = 12;
    row.unit = 'toz';

    component.removeGoldRow(row.id);

    expect(component.goldRows.length).toBe(1);
    expect(component.goldRows[0]).toMatchObject({ type: goldTypes[0].name, weight: 0, unit: 'grams' });
  });

  it('resets the only silver row to defaults instead of removing it', () => {
    const row = component.silverRows[0];
    row.type = silverTypes[silverTypes.length - 1].name;
    row.weight = 5;
    row.unit = 'toz';

    component.removeSilverRow(row.id);

    expect(component.silverRows.length).toBe(1);
    expect(component.silverRows[0]).toMatchObject({ type: silverTypes[0].name, weight: 0, unit: 'grams' });
  });

  it('keeps the remove button enabled on the last row', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.remove-btn') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(2);
    buttons.forEach(button => expect(button.disabled).toBe(false));
  });

  describe('offer check', () => {
    beforeEach(() => {
      component.spotPrices = { gold: 2000, silver: 25, timestamp: new Date() };
      const row = component.goldRows[0];
      row.type = goldTypes[0].name;
      row.weight = 1;
      row.unit = 'toz';
      component.calculate();
    });

    it('converts an offer amount to percent of combined spot', () => {
      component.onOfferAmountChange(1598.4);
      expect(component.offerPercent).toBe(80);
    });

    it('converts a percent to an offer amount', () => {
      component.onOfferPercentChange(90);
      expect(component.offerAmount).toBe(1798.2);
    });

    it('keeps the last edited field fixed when totals change', () => {
      component.onOfferPercentChange(50);
      component.addSilverRow();
      const silver = component.silverRows[1];
      silver.type = silverTypes[0].name;
      silver.weight = 1;
      silver.unit = 'toz';
      component.calculate();

      expect(component.offerPercent).toBe(50);
      expect(component.offerAmount).toBe(1011.49);
    });
  });

  describe('spot price edit', () => {
    beforeEach(() => {
      component.livePrices = { gold: 2000, silver: 25, timestamp: new Date() };
      component.spotPrices = { ...component.livePrices };
      const row = component.goldRows[0];
      row.type = goldTypes[0].name;
      row.weight = 1;
      row.unit = 'toz';
      component.calculate();
    });

    it('applies a manual price and recalculates', () => {
      component.startPriceEdit('gold');
      component.editPrice = 1900;
      component.commitPriceEdit();

      expect(component.spotPrices.gold).toBe(1900);
      expect(component.overridden.gold).toBe(true);
      expect(component.goldTotals.spotValue).toBeCloseTo(1898.1);
    });

    it('ignores blank or non-positive prices', () => {
      component.startPriceEdit('gold');
      component.editPrice = null;
      component.commitPriceEdit();

      expect(component.spotPrices.gold).toBe(2000);
      expect(component.overridden.gold).toBe(false);
      expect(component.editingMetal).toBeNull();
    });

    it('cancels without changing the price', () => {
      component.startPriceEdit('silver');
      component.editPrice = 30;
      component.cancelPriceEdit();

      expect(component.spotPrices.silver).toBe(25);
    });

    it('resets to the live price', () => {
      component.startPriceEdit('gold');
      component.editPrice = 1900;
      component.commitPriceEdit();
      component.resetPrice('gold');

      expect(component.spotPrices.gold).toBe(2000);
      expect(component.overridden.gold).toBe(false);
      expect(component.goldTotals.spotValue).toBeCloseTo(1998);
    });
  });
});

describe('PreciousMetalsComponent notes, saving, and sharing', () => {
  let component: PreciousMetalsComponent;
  let fixture: ComponentFixture<PreciousMetalsComponent>;
  let store: Record<string, string>;

  const ring: MetalListItem = { metal: 'gold', type: '14K Gold (58.3%)', weight: 4.2, unit: 'grams', note: 'nugget ring' };
  const bar: MetalListItem = { metal: 'silver', type: 'Fine Silver (99.9%)', weight: 1, unit: 'toz' };

  const setup = async (query: Record<string, string> = {}, prices = () => of({ gold: 2000, silver: 25, timestamp: new Date() })) => {
    await TestBed.configureTestingModule({
      imports: [PreciousMetalsComponent],
      providers: [
        { provide: SpotPriceService, useValue: { getSpotPrices: prices } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreciousMetalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

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

  it('should show a row note in the breakdown', async () => {
    await setup();
    Object.assign(component.goldRows[0], { type: '14K Gold (58.3%)', weight: 4.2, note: 'nugget ring' });
    component.calculate();
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(component.goldBreakdowns[0].note).toBe('nugget ring');
    expect((fixture.nativeElement as HTMLElement).querySelector('.row-note')?.textContent).toBe('nugget ring');
  });

  it('should list only weighed rows, gold first, with trimmed optional notes', async () => {
    await setup();
    Object.assign(component.goldRows[0], { type: '14K Gold (58.3%)', weight: 4.2, note: ' nugget ring ' });
    component.addGoldRow();
    Object.assign(component.silverRows[0], { type: 'Fine Silver (99.9%)', weight: 1, unit: 'toz', note: '' });

    expect(component.items).toEqual([ring, bar]);
    expect(component.shareValue).toBe(encodeMetalList([ring, bar]));
  });

  it('should have nothing to save or share until something is weighed', async () => {
    await setup();
    expect(component.itemsOrNull).toBeNull();
    expect(component.shareValue).toBeNull();
  });

  it('should load a shared list, its name, and recalculate', async () => {
    await setup({ metals: encodeMetalList([ring, bar]), name: 'Smith estate' });

    expect(component.goldRows.map(r => [r.type, r.weight, r.note])).toEqual([['14K Gold (58.3%)', 4.2, 'nugget ring']]);
    expect(component.silverRows.map(r => [r.type, r.weight, r.unit])).toEqual([['Fine Silver (99.9%)', 1, 'toz']]);
    expect(component.listName).toBe('Smith estate');
    expect(component.linkNotice).toBe('Loaded a shared list of 2 pieces.');
    expect(component.grandTotals.spotValue).toBeGreaterThan(0);
  });

  it('should keep an empty row for a metal the shared list leaves out', async () => {
    await setup({ metals: encodeMetalList([bar]) });

    expect(component.goldRows.length).toBe(1);
    expect(component.goldRows[0].weight).toBe(0);
    expect(component.linkNotice).toBe('Loaded a shared list of 1 piece.');
  });

  it('should say when part of a shared link could not be read', async () => {
    const tampered = btoa(JSON.stringify([['g', '14K Gold (58.3%)', 4.2, 'g'], ['g', 'Mystery', 1, 'g']]));
    await setup({ metals: tampered });

    expect(component.linkNotice).toBe('Loaded a shared list of 1 piece. 1 entry in the link wasn\'t recognized.');
  });

  it('should save a weighed list and load it back with notes', async () => {
    await setup();
    Object.assign(component.goldRows[0], { type: '14K Gold (58.3%)', weight: 4.2, note: 'nugget ring' });

    component.savedLists.save('Client A', component.items);
    expect(JSON.parse(store['utilities-metal-lists'])[0].items).toEqual([ring]);

    component.removeGoldRow(component.goldRows[0].id);
    expect(component.items).toEqual([]);

    component.loadList(component.savedLists.lists()[0]);
    expect(component.items).toEqual([ring]);
    expect(component.describeList(component.savedLists.lists()[0].items)).toBe('1 piece');
  });

  it('should keep empty notes collapsed until toggled, and always show a note with text', async () => {
    await setup();
    const el = () => fixture.nativeElement as HTMLElement;
    const render = () => { fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck(); fixture.detectChanges(); };

    expect(el().querySelectorAll('.note-input').length).toBe(0);
    expect(el().querySelectorAll('.note-toggle').length).toBe(2);

    (el().querySelector('.note-toggle') as HTMLButtonElement).click();
    render();
    expect(el().querySelectorAll('.note-input').length).toBe(1);
    expect(el().querySelector('.note-toggle')?.getAttribute('aria-expanded')).toBe('true');

    component.toggleNote(component.goldRows[0]);
    component.silverRows[0].note = 'spoon set';
    render();
    expect(el().querySelectorAll('.note-input').length).toBe(1);
    expect(component.isNoteOpen(component.silverRows[0])).toBe(false);
    expect(el().querySelectorAll('.note-toggle').length).toBe(1);
  });

  it('should show notes expanded on rows loaded from a shared link', async () => {
    await setup({ metals: encodeMetalList([ring, bar]) });
    const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('.note-input');

    expect(inputs.length).toBe(1);
    expect(component.hasNote(component.goldRows[0])).toBe(true);
  });

  it('should take a custom silver percent and carry it through save and share', async () => {
    await setup();
    Object.assign(component.silverRows[0], { type: 'Custom %', purity: 70, weight: 31.1035, unit: 'grams' });
    component.calculate();
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.purity-input')).toBeTruthy();
    expect(component.silverBreakdowns[0].type).toBe('Silver 70%');
    expect(component.silverTotals.spotValue).toBeCloseTo(0.7 * 25, 4);

    const item = component.items.find(i => i.metal === 'silver')!;
    expect(item).toEqual({ metal: 'silver', type: 'Custom %', purity: 70, weight: 31.1035, unit: 'grams' });

    component.loadList({ name: 'x', savedAt: '', items: [item] });
    expect(component.silverRows[0].purity).toBe(70);
  });

  it('should build the quote from the current rows and only include an offer while the check is open', async () => {
    await setup();
    component.spotPrices = { gold: 2000, silver: 25, timestamp: new Date() };
    Object.assign(component.goldRows[0], { type: goldTypes[0].name, weight: 1, unit: 'toz', note: 'bar' });
    component.listName = 'Smith estate';
    component.calculate();
    component.onOfferAmountChange(1500);

    expect(component.quote).toMatchObject({
      name: 'Smith estate',
      gold: [{ type: goldTypes[0].name, note: 'bar' }],
      silver: [],
      offer: null,
    });

    component.toggleOffer();
    expect(component.quote.offer).toEqual({ amount: 1500, percent: component.offerPercent });
  });

  describe('shared spot prices', () => {
    // 1 oz t of 24K gold and 1 oz t of fine silver.
    const pieces: MetalListItem[] = [
      { metal: 'gold', type: goldTypes[0].name, weight: 1, unit: 'toz' },
      { metal: 'silver', type: 'Fine Silver (99.9%)', weight: 1, unit: 'toz' },
    ];
    const sharedAt = new Date('2026-09-01T12:00:00Z');
    const link = { metals: encodeMetalList(pieces), spot: encodeSpotPrices({ gold: 1000, silver: 10, timestamp: sharedAt })! };
    const el = () => fixture.nativeElement as HTMLElement;
    const render = () => { fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck(); fixture.detectChanges(); };

    it('should put the prices in use into the share link', async () => {
      await setup();
      expect(component.shareExtras['spot']).toMatch(/^2000_25_\d+$/);
    });

    it('should not ask about prices for a link without them', async () => {
      await setup({ metals: link.metals });

      expect(component.pricePrompt).toBe(false);
      expect(el().querySelector('.price-choice')).toBeNull();
    });

    it('should offer the shared and today\'s prices, each with its numbers', async () => {
      await setup(link);

      const shared = el().querySelector('.shared-choice')!.textContent!;
      const today = el().querySelector('.today-choice')!.textContent!;
      expect(shared).toContain('Gold $1000.00');
      expect(shared).toContain('Silver $10.00');
      expect(shared).toContain(`Total $${(999 + 9.99).toFixed(2)}`);
      expect(today).toContain('Gold $2000.00');
      expect(today).toContain(`Total $${(1998 + 24.975).toFixed(2)}`);
    });

    it('should value the list at the shared prices when chosen, marked as set by hand', async () => {
      await setup(link);

      (el().querySelector('.shared-choice') as HTMLButtonElement).click();
      render();

      expect(el().querySelector('.price-choice')).toBeNull();
      expect(component.spotPrices).toEqual({ gold: 1000, silver: 10, timestamp: sharedAt });
      expect(component.overridden).toEqual({ gold: true, silver: true });
      expect(component.grandTotals.spotValue).toBeCloseTo(1008.99, 2);
    });

    it('should value the list at today\'s prices when chosen', async () => {
      await setup(link);

      component.useTodaysPrices();

      expect(component.pricePrompt).toBe(false);
      expect(component.spotPrices.gold).toBe(2000);
      expect(component.overridden).toEqual({ gold: false, silver: false });
      expect(component.grandTotals.spotValue).toBeCloseTo(2022.975, 3);
    });

    it('should keep shared prices when live prices arrive later, and wait to offer today\'s', async () => {
      const live = new Subject<SpotPrices>();
      await setup(link, () => live);

      expect(el().querySelector('.today-choice')!.textContent).toContain('Loading live prices');
      expect((el().querySelector('.today-choice') as HTMLButtonElement).disabled).toBe(true);

      component.useSharedPrices();
      live.next({ gold: 2000, silver: 25, timestamp: new Date() });

      expect(component.spotPrices.gold).toBe(1000);
      expect(component.livePrices.gold).toBe(2000);
      expect(component.overridden).toEqual({ gold: true, silver: true });
    });

    it('should go back to live prices on refresh', async () => {
      await setup(link);
      component.useSharedPrices();

      component.refreshPrices();

      expect(component.spotPrices.gold).toBe(2000);
      expect(component.overridden).toEqual({ gold: false, silver: false });
    });
  });
});
