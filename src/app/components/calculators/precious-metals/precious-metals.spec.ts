import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';

import { describeEntries, PreciousMetalsComponent } from './precious-metals';
import { goldTypes, platinumTypes, silverTypes } from '../../../constants/constants';
import { COIN_OPTIONS } from '../../../constants/coin-options';
import { SpotPriceService } from '../../../services/spot-price';
import { encodeMetalList, encodeSpotPrices, MetalListItem } from './metal-list';

describe('PreciousMetalsComponent', () => {
  let component: PreciousMetalsComponent;
  let fixture: ComponentFixture<PreciousMetalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreciousMetalsComponent],
      // Without a stub the real spot price API is called and whenStable waits on it.
      providers: [{ provide: SpotPriceService, useValue: { getSpotPrices: () => of({ gold: 2000, silver: 25, timestamp: new Date() }) } }],
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

    it('prices a gram of each type at spot', () => {
      const prices = component.typePrices('gold');
      const fourteen = prices.find(p => p.name === '14K (58.3%)')!;

      expect(prices.length).toBe(goldTypes.length);
      expect(fourteen.perGram).toBeCloseTo(2000 / 31.1035 * 0.583, 2);
      expect(component.typePrices('silver').map(p => p.name)).toEqual(
        ['Fine (99.9%)', 'Britannia (95.8%)', 'Mexican/French (95%)', 'Sterling (92.5%)', 'Coin (90%)',
          'Continental (83.5%)', 'Scandinavian (83%)', 'European (80%)']);
    });

    it('lists each fineness with the stamp found on the piece', async () => {
      await fixture.whenStable();
      const options = (select: string) => Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(`select[aria-label="${select}"] option`), o => o.textContent!.trim());
      expect(options('Gold type')).toContain('9K Gold (37.5%) · 375');
      expect(options('Gold type')).toContain('14K Gold (58.3%) · 585');
      expect(options('Silver type')).toContain('Sterling Silver (92.5%) · 925');
      expect(options('Silver type')).toContain('Mexican/French Silver (95%) · 950');
    });

    it('drops down type prices on a card click but not on the price', () => {
      const card = { closest: () => null } as unknown as HTMLElement;
      const price = { closest: () => ({}) } as unknown as HTMLElement;

      component.onSpotCardClick({ target: price } as unknown as MouseEvent);
      expect(component.typePricesOpen).toBe(false);

      component.onSpotCardClick({ target: card } as unknown as MouseEvent);
      expect(component.typePricesOpen).toBe(true);

      component.toggleTypePrices();
      expect(component.typePricesOpen).toBe(false);
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

    const toggles = () => el().querySelectorAll<HTMLButtonElement>('.note-toggle');

    expect(el().querySelectorAll('.note-input').length).toBe(0);
    expect(toggles().length).toBe(2);
    expect(toggles()[0].textContent!.trim()).toBe('📝');

    toggles()[0].click();
    render();
    expect(el().querySelectorAll('.note-input').length).toBe(1);
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('true');
    expect(toggles()[0].textContent!.trim()).toBe('📝');

    toggles()[0].click();
    render();
    expect(el().querySelectorAll('.note-input').length).toBe(0);

    component.silverRows[0].note = 'spoon set';
    render();
    expect(el().querySelectorAll('.note-input').length).toBe(1);
    expect(toggles().length).toBe(2);
    expect(toggles()[1].disabled).toBe(true);
    expect(toggles()[1].title).toBe('Clear the note to hide it');

    component.toggleNote(component.silverRows[0]);
    render();
    expect(el().querySelectorAll('.note-input').length).toBe(1);
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

    const item = component.items.find(i => 'metal' in i && i.metal === 'silver')!;
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
      expect(component.overridden).toMatchObject({ gold: true, silver: true });
      expect(component.grandTotals.spotValue).toBeCloseTo(1008.99, 2);
    });

    it('should value the list at today\'s prices when chosen', async () => {
      await setup(link);

      component.useTodaysPrices();

      expect(component.pricePrompt).toBe(false);
      expect(component.spotPrices.gold).toBe(2000);
      expect(component.overridden).toMatchObject({ gold: false, silver: false });
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
      expect(component.overridden).toMatchObject({ gold: true, silver: true });
    });

    it('should go back to live prices on refresh', async () => {
      await setup(link);
      component.useSharedPrices();

      component.refreshPrices();

      expect(component.spotPrices.gold).toBe(2000);
      expect(component.overridden).toMatchObject({ gold: false, silver: false });
    });
  });

  it('should take a custom gold percent and carry it into saved lists', async () => {
    await setup();
    Object.assign(component.goldRows[0], { type: 'Custom %', purity: 62.5, weight: 31.1035, unit: 'grams' });
    component.calculate();
    fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[aria-label="Gold percent"]')).toBeTruthy();
    expect(component.goldBreakdowns[0].type).toBe('Gold 62.5%');
    expect(component.goldTotals.spotValue).toBeCloseTo(0.625 * 2000, 4);
    expect(component.items[0]).toEqual({ metal: 'gold', type: 'Custom %', purity: 62.5, weight: 31.1035, unit: 'grams' });
  });

  describe('collapsing gold and silver', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const render = () => { fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck(); fixture.detectChanges(); };
    const toggle = (section: string) => el().querySelector<HTMLButtonElement>(`[aria-controls="${section}Panel"]`)!;

    it('should start open and fold away on a header click, keeping a summary and the totals', async () => {
      await setup();
      Object.assign(component.goldRows[0], { type: goldTypes[0].name, weight: 1, unit: 'toz' });
      component.addCoin('gold-american-gold-eagle-1-oz-22k');
      component.calculate();
      render();

      expect(toggle('gold').getAttribute('aria-expanded')).toBe('true');
      expect(toggle('silver').getAttribute('aria-expanded')).toBe('true');
      expect(el().querySelector('select[aria-label="Gold type"]')).not.toBeNull();

      toggle('gold').click();
      render();

      expect(toggle('gold').getAttribute('aria-expanded')).toBe('false');
      expect(el().querySelector('select[aria-label="Gold type"]')).toBeNull();
      expect(el().querySelector('#goldPanel')).toBeNull();
      expect(toggle('gold').querySelector('.section-summary')?.textContent)
        .toBe(`1 piece · 1 coin · $${component.goldTotals.spotValue.toFixed(2)}`);
      expect(component.grandTotals.spotValue).toBeCloseTo(component.goldTotals.spotValue, 2);
      expect(el().querySelector('select[aria-label="Silver type"]')).not.toBeNull();

      toggle('gold').click();
      render();

      expect(el().querySelector('select[aria-label="Gold type"]')).not.toBeNull();
    });

    it('should show no summary on a closed section with nothing in it', async () => {
      await setup();
      toggle('silver').click();
      render();

      expect(toggle('silver').querySelector('.section-summary')).toBeNull();
      expect(component.sectionSummary('silver')).toBeNull();
    });
  });

  describe('copy summary', () => {
    it('should copy the quote as text and say so', async () => {
      await setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      Object.assign(component.goldRows[0], { type: goldTypes[0].name, weight: 1, unit: 'toz' });
      component.spotPrices = { gold: 4000, silver: 50, timestamp: new Date() };
      component.calculate();

      await component.copySummary();

      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('- 24K Gold (99.9%): 31.10 g, $3,996.00'));
      expect(component.summaryCopied).toBe(true);
    });
  });

  describe('type names', () => {
    it('should give full names, and short ones on a phone', async () => {
      await setup();
      const label = (types: MetalType[], index: number) => component.typeLabel(types[index]);

      expect(label(goldTypes, 3)).toBe('14K Gold (58.3%) · 585');

      component.narrow = true;
      expect(label(goldTypes, 3)).toBe('14K 58.3% · 585');
      expect(label(silverTypes, 3)).toBe('Sterling 92.5% · 925');
      expect(label(silverTypes, 7)).toBe('German/European 80% · 800');
      expect(label(platinumTypes, 0)).toBe('Fine 99.95% · 999');
      expect(label(platinumTypes, 1)).toBe('95% · 950');
    });
  });

  describe('stone weight', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const render = () => { fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck(); fixture.detectChanges(); };

    it('should take a stone off the gold, show it in the breakdown, and carry it in the list', async () => {
      await setup();
      Object.assign(component.goldRows[0], { type: goldTypes[0].name, weight: 5, unit: 'grams' });
      component.calculate();
      render();
      const fullValue = component.goldTotals.spotValue;

      expect(el().querySelector('.stone-input')).toBeNull();
      component.toggleStone(component.goldRows[0]);
      render();
      expect(el().querySelector('.stone-input')).not.toBeNull();

      component.goldRows[0].stone = 2.5;
      component.calculate();
      render();

      expect(component.goldTotals.totalWeightGrams).toBeCloseTo(4.5, 6);
      expect(component.goldTotals.spotValue).toBeCloseTo(fullValue * 0.9, 2);
      expect(el().textContent).toContain('less 2.5 ct stone');
      expect(component.items[0]).toMatchObject({ metal: 'gold', weight: 5, stone: 2.5 });
    });

    it('should warn when the stone weighs as much as the piece', async () => {
      await setup();
      Object.assign(component.goldRows[0], { type: goldTypes[0].name, weight: 1, unit: 'grams', stone: 5 });
      component.calculate();
      render();

      expect(el().querySelector('.stone-warning')).not.toBeNull();
      expect(component.goldBreakdowns.length).toBe(0);
    });
  });

  describe('platinum and palladium', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const render = () => { fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck(); fixture.detectChanges(); };
    const withPlatinum = () => of({ gold: 2000, silver: 25, platinum: 1000, palladium: -1, timestamp: new Date() });
    const toggle = () => el().querySelector<HTMLButtonElement>('[aria-controls="pgmPanel"]')!;

    it('should stay closed until its header is clicked', async () => {
      await setup({}, withPlatinum);
      render();

      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(el().querySelector('#pgmPanel')).toBeNull();
      expect(el().querySelector('select[aria-label="Platinum type"]')).toBeNull();

      toggle().click();
      render();

      expect(toggle().getAttribute('aria-expanded')).toBe('true');
      expect(el().querySelector('select[aria-label="Platinum type"]')).not.toBeNull();
      expect(el().querySelector('select[aria-label="Palladium type"]')).not.toBeNull();
      expect(el().textContent).toContain('$1000.00/oz');
    });

    it('should value platinum at the live price, count it in the totals, and show it on the closed header', async () => {
      await setup({}, withPlatinum);
      Object.assign(component.pgmRows.platinum[0], { type: 'Platinum (95%)', weight: 1, unit: 'toz' });
      component.calculate();
      render();

      expect(component.pgmTotals.platinum.spotValue).toBeCloseTo(950, 2);
      expect(component.grandTotals.spotValue).toBeCloseTo(950, 2);
      expect(toggle().querySelector('.section-summary')?.textContent).toBe('1 piece · $950.00');
      expect(component.items).toEqual([{ metal: 'platinum', type: 'Platinum (95%)', weight: 1, unit: 'toz' }]);
      expect(component.quote.others?.map(other => other.title)).toEqual(['Platinum']);
    });

    it('should ask for a palladium price, then keep a typed one through a refresh', async () => {
      await setup({}, withPlatinum);
      component.toggleSection('pgm');
      Object.assign(component.pgmRows.palladium[0], { type: 'Palladium (95%)', weight: 1, unit: 'toz' });
      component.calculate();
      render();

      expect(el().querySelector('.pgm-no-price')?.textContent).toContain('No live palladium price');
      expect(component.pgmTotals.palladium.spotValue).toBe(0);

      component.startPriceEdit('palladium');
      component.editPrice = 1200;
      component.commitPriceEdit();
      render();

      expect(component.pgmTotals.palladium.spotValue).toBeCloseTo(1140, 2);
      expect(el().querySelector('.pgm-no-price')).toBeNull();

      component.refreshPrices();

      expect(component.price('palladium')).toBe(1200);
      expect(component.pgmTotals.palladium.spotValue).toBeCloseTo(1140, 2);
    });

    it('should load platinum from a shared link but stay closed, with shared platinum prices offered', async () => {
      const band: MetalListItem = { metal: 'platinum', type: 'Platinum (95%)', weight: 1, unit: 'toz' };
      const at = new Date('2026-10-01T12:00:00Z');
      await setup({
        metals: encodeMetalList([band]),
        spot: encodeSpotPrices({ gold: 1000, silver: 10, platinum: 800, timestamp: at })!,
      }, withPlatinum);
      render();

      expect(component.open.pgm).toBe(false);
      expect(component.pgmRows.platinum.map(row => row.type)).toEqual(['Platinum (95%)']);
      expect(el().querySelector('.shared-choice')?.textContent).toContain('Platinum $800.00');

      (el().querySelector('.shared-choice') as HTMLButtonElement).click();

      expect(component.pgmTotals.platinum.spotValue).toBeCloseTo(760, 2);
      expect(component.overridden.platinum).toBe(true);
    });
  });

  describe('saved lists', () => {
    const KEY = 'utilities-metal-lists';
    const el = () => fixture.nativeElement as HTMLElement;
    const render = () => { fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck(); fixture.detectChanges(); };
    const saveButton = () => el().querySelector('.save-share .btn-primary') as HTMLButtonElement;
    const savedNames = () => [...el().querySelectorAll('.save-share .list-name')].map(n => n.textContent);
    const saved = () => JSON.parse(store[KEY] ?? '[]') as { name: string; items: MetalListItem[]; savedAt: string }[];
    const button = (label: string) => el().querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;

    const typeName = (name: string) => {
      const input = el().querySelector('#saveShareName') as HTMLInputElement;
      input.value = name;
      input.dispatchEvent(new Event('input'));
      render();
    };
    const weigh = (rows: MetalRow[], ...pieces: Partial<MetalRow>[]) => {
      pieces.forEach((piece, index) => {
        if (index > 0) rows === component.goldRows ? component.addGoldRow() : component.addSilverRow();
        const target = rows === component.goldRows ? component.goldRows : component.silverRows;
        Object.assign(target[target.length - 1], piece);
      });
      component.calculate();
      render();
    };
    const saveAs = (name: string) => {
      typeName(name);
      saveButton().click();
      render();
    };
    const reload = async () => {
      TestBed.resetTestingModule();
      await setup();
    };

    it('should only save once a piece is weighed and the list has a name', async () => {
      await setup();
      expect(saveButton().disabled).toBe(true);

      weigh(component.goldRows, { type: '14K Gold (58.3%)', weight: 4.2, note: 'nugget ring' });
      expect(saveButton().disabled).toBe(true);

      typeName('   ');
      expect(saveButton().disabled).toBe(true);

      saveAs('Smith estate');

      expect(saved()).toEqual([{ name: 'Smith estate', items: [ring], savedAt: expect.any(String) }]);
      expect(savedNames()).toEqual(['Smith estate']);
      expect(el().querySelector('.save-share .meta')?.textContent).toBe('1 piece');
      expect(el().querySelector('.save-share .notice')?.textContent).toContain('Saved “Smith estate” in this browser.');
    });

    it('should keep a list across a reload and restore every row, unit, note, and custom percent', async () => {
      await setup();
      weigh(component.goldRows,
        { type: '14K Gold (58.3%)', weight: 4.2, unit: 'grams', note: 'nugget ring' },
        { type: 'Custom %', purity: 62.5, weight: 1, unit: 'toz' });
      weigh(component.silverRows,
        { type: 'Fine Silver (99.9%)', weight: 1, unit: 'toz' },
        { type: 'Custom %', purity: 70, weight: 31.1035, unit: 'grams', note: 'old bracelet' },
        { weight: 0 });
      const expected = component.items;
      saveAs('Estate');

      expect(expected.length).toBe(4);
      expect(saved()[0].items).toEqual(expected);
      expect(el().querySelector('.save-share .meta')?.textContent).toBe('4 pieces');

      await reload();
      expect(component.items).toEqual([]);
      expect(savedNames()).toEqual(['Estate']);

      button('Load Estate').click();
      render();
      // ngModel writes values into inputs a tick after they render.
      await fixture.whenStable();

      expect(component.items).toEqual(expected);
      expect(component.listName).toBe('Estate');
      expect(component.goldRows.map(row => row.purity)).toEqual([undefined, 62.5]);
      expect(component.silverRows.map(row => row.unit)).toEqual(['toz', 'grams']);
      expect([...el().querySelectorAll('.note-input')].map(input => (input as HTMLInputElement).value))
        .toEqual(['nugget ring', 'old bracelet']);
      // 4.2 g of 14K, 1 oz t at 62.5%, 1 oz t of .999 silver, 1 oz t at 70% silver.
      const gold = (4.2 * 0.583 / 31.1035 + 0.625) * 2000;
      const silver = (0.999 + 0.7) * 25;
      expect(component.grandTotals.spotValue).toBeCloseTo(gold + silver, 2);
    });

    it('should replace a list saved again under the same name, ignoring case, and keep the newest first', async () => {
      await setup();
      weigh(component.goldRows, { type: '14K Gold (58.3%)', weight: 4.2 });
      saveAs('Alpha');
      saveAs('Beta');

      component.addSilverRow();
      weigh(component.silverRows, { type: 'Fine Silver (99.9%)', weight: 1, unit: 'toz' });
      saveAs('alpha');

      expect(savedNames()).toEqual(['alpha', 'Beta']);
      expect(saved().map(list => list.items.length)).toEqual([2, 1]);
    });

    it('should delete a saved list from the panel and from storage', async () => {
      await setup();
      weigh(component.goldRows, { type: '14K Gold (58.3%)', weight: 4.2 });
      saveAs('Keep');
      saveAs('Drop');

      button('Delete Drop').click();
      render();

      expect(savedNames()).toEqual(['Keep']);
      expect(saved().map(list => list.name)).toEqual(['Keep']);
      expect(component.items.length).toBe(1);
    });

    it('should replace what is on screen when loading, leaving an empty row for a metal the list lacks', async () => {
      store[KEY] = JSON.stringify([{ name: 'Rings', items: [ring], savedAt: '2026-10-01T00:00:00.000Z' }]);
      await setup({ metals: encodeMetalList([bar]) });
      expect(component.linkNotice).not.toBeNull();

      button('Load Rings').click();
      render();

      expect(component.items).toEqual([ring]);
      expect(component.silverRows).toEqual([expect.objectContaining({ type: silverTypes[0].name, weight: 0 })]);
      expect(component.silverTotals.spotValue).toBe(0);
      expect(component.linkNotice).toBeNull();
      expect(el().querySelector('.link-notice')).toBeNull();
    });

    it('should drop saved entries it can no longer read and keep the rest', async () => {
      const savedAt = '2026-10-01T00:00:00.000Z';
      store[KEY] = JSON.stringify([
        { name: 'Good', items: [ring, { metal: 'gold', type: 'Custom %', purity: 62.5, weight: 1, unit: 'toz' }], savedAt },
        { name: 'Unknown type', items: [{ ...ring, type: '13K Gold' }], savedAt },
        { name: 'Bad percent', items: [{ metal: 'gold', type: 'Custom %', purity: 150, weight: 1, unit: 'toz' }], savedAt },
        { name: 'Bad unit', items: [{ ...bar, unit: 'stone' }], savedAt },
        { name: 'No date', items: [bar] },
        'not a list',
      ]);
      await setup();

      expect(savedNames()).toEqual(['Good']);
      expect(el().querySelector('.save-share .meta')?.textContent).toBe('2 pieces');
    });

    it('should still work, without remembering, when storage is blocked', async () => {
      vi.stubGlobal('localStorage', {
        getItem: () => { throw new Error('blocked'); },
        setItem: () => { throw new Error('blocked'); },
      });
      await setup();
      weigh(component.goldRows, { type: '14K Gold (58.3%)', weight: 4.2 });

      saveAs('Session only');
      expect(savedNames()).toEqual(['Session only']);

      await reload();
      expect(savedNames()).toEqual([]);
    });
  });

  describe('coins', () => {
    const morgan = 'silver-morgan-dollar-1878-1921';
    const eagle = 'gold-american-gold-eagle-1-oz-22k';
    // 26.73 g × .900 Morgan and 33.931 g × .9167 Eagle.
    const morganToz = 26.73 * 0.9 / 31.1035;
    const eagleToz = 33.931 * 0.9167 / 31.1035;
    const el = () => fixture.nativeElement as HTMLElement;
    const render = () => { fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck(); fixture.detectChanges(); };

    it('should add a coin, count up when picked again, and leave out coins with no metal', async () => {
      await setup();
      component.addCoin(morgan);
      component.addCoin(morgan);
      component.addCoin('nope');

      expect(component.coinRows.map(row => [row.coin.id, row.quantity])).toEqual([[morgan, 2]]);
      expect(component.coinOptions.length).toBeGreaterThan(0);
      const coins = component.coinOptions.filter(option => !option.warning);
      expect(coins.every(option => !!option.disabled === (findCoinPurity(option.id) === 0))).toBe(true);
      component.addCoin('silver-eisenhower-dollar-1971-1978-p-d-copper-nickel');
      expect(component.coinRows.length).toBe(1);
    });

    it('should find coins by a year and words in any order', async () => {
      await setup();
      const input = el().querySelector<HTMLInputElement>('input[aria-label="Add a coin"]')!;
      const search = (text: string) => {
        input.dispatchEvent(new Event('focus'));
        input.value = text;
        input.dispatchEvent(new Event('input'));
        render();
        return Array.from(el().querySelectorAll('.combo-option'), li => li.textContent!.trim());
      };

      expect(search('1944 dime')).toEqual(['Silver · Mercury Dime · 1916-1945', 'Silver · Canadian Dime · 1920-1967']);
      expect(search('dime mercury')).toEqual(['Silver · Mercury Dime · 1916-1945']);
      expect(search('mercury')).toEqual(['Silver · Mercury Dime · 1916-1945']);
      input.dispatchEvent(new Event('focus'));
      input.value = '';
      render();
      expect(el().querySelector('.combo-option.disabled')).toBeNull();
      expect(search('1925 morgan')).toEqual([]);
      expect(search('1976 eisenhower')).toEqual([
        'Silver · Eisenhower Dollar · 1971-1976 S (40% silver)',
        'Eisenhower Dollar · 1971-1978 P/D (copper-nickel) · no silver',
      ]);
      expect(search('1976 s eisenhower')).toEqual(['Silver · Eisenhower Dollar · 1971-1976 S (40% silver)']);
      expect(search('1976 d eisenhower')).toEqual(['Eisenhower Dollar · 1971-1978 P/D (copper-nickel) · no silver']);
      el().querySelector<HTMLElement>('.combo-option.disabled')!.click();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.coinRows).toEqual([]);
      expect(search('1980 dime')).toEqual(['Roosevelt Dime · 1965+ P/D (copper-nickel) · no silver']);
      expect(search('1976-s quarter')).toEqual(['Silver · Washington Quarter · 1976 S (40% silver)']);
      expect(search('2021s dime')).toEqual(['Silver · Roosevelt Dime · 2019+ S (silver proof)']);
      expect(search('1885 cc morgan')).toEqual(['Silver · Morgan Dollar · 1878-1921']);
      expect(search('1943 nickel')).toEqual(['Silver · Jefferson Nickel (War Nickel) · 1942-1945 (35% silver, large mint mark above dome)']);
      expect(search('1942 d nickel')).toEqual([
        'Silver · Jefferson Nickel (War Nickel) · 1942-1945 (35% silver, large mint mark above dome)',
        'Jefferson Nickel · 1938-1942 (copper-nickel, incl. 1942-D) · no silver',
      ]);
      expect(search('1979 anthony')).toEqual(['Susan B. Anthony Dollar · 1979-1999 (copper-nickel) · no silver']);
      expect(search('1968 canadian dime')).toEqual(['Silver · Canadian Dime · 1967-1968 (50% silver)']);
      expect(search('2021 silver eagle')).toEqual(['Silver · American Silver Eagle · 1 toz']);
      expect(search('1985 silver eagle')).toEqual([]);
      expect(search('2010 silver panda')).toEqual(['Silver · Chinese Silver Panda · 1 toz (current)']);
      expect(search('2020 silver panda')).toEqual(['Silver · Chinese Silver Panda · 30g (2016+)']);
      const keyDime = '⚠ 1916-D Mercury Dime is a key date · often worth far more than melt, check before selling';
      expect(search('1916 d mercury')).toEqual(['Silver · Mercury Dime · 1916-1945', keyDime]);
      expect(search('1916-d mercury')).toEqual(['Silver · Mercury Dime · 1916-1945', keyDime]);
      expect(search('1916 mercury')).toEqual(['Silver · Mercury Dime · 1916-1945', keyDime]);
      expect(search('1916 s mercury')).toEqual(['Silver · Mercury Dime · 1916-1945']);
      expect(search('1917 mercury')).toEqual(['Silver · Mercury Dime · 1916-1945']);
      expect(search('1895 morgan')).toContain('⚠ 1895 (no mint mark) Morgan Dollar is a key date · often worth far more than melt, check before selling');
      expect(el().querySelector('.combo-option.warning')).not.toBeNull();
    });

    it('should value coins in the matching metal breakdown, named with their count and note', async () => {
      await setup();
      component.addCoin(morgan);
      component.addCoin(eagle);
      component.coinRows[0].quantity = 10;
      component.coinRows[0].note = 'from grandpa';
      component.calculate();

      expect(component.silverBreakdowns).toEqual([expect.objectContaining({
        type: 'Morgan Dollar · 1878-1921 × 10',
        note: 'from grandpa',
      })]);
      expect(component.silverTotals.totalPureToz).toBeCloseTo(morganToz * 10, 6);
      expect(component.goldTotals.totalPureToz).toBeCloseTo(eagleToz, 6);
      expect(component.grandTotals.spotValue).toBeCloseTo(morganToz * 10 * 25 + eagleToz * 2000, 4);
      expect(component.quote.silver[0].type).toBe('Morgan Dollar · 1878-1921 × 10');
    });

    it('should ignore blank or fractional counts until fixed, and drop removed coins from the totals', async () => {
      await setup();
      component.addCoin(morgan);
      component.coinRows[0].quantity = 1.5;
      component.calculate();
      expect(component.silverBreakdowns).toEqual([]);
      expect(component.items).toEqual([]);

      component.coinRows[0].quantity = 3;
      component.calculate();
      expect(component.silverTotals.totalPureToz).toBeCloseTo(morganToz * 3, 6);

      component.removeCoinRow(component.coinRows[0]);
      expect(component.coinRows).toEqual([]);
      expect(component.silverTotals.spotValue).toBe(0);
    });

    it('should save and share coins with notes next to weighed pieces', async () => {
      await setup();
      Object.assign(component.goldRows[0], { type: '14K Gold (58.3%)', weight: 4.2, note: 'nugget ring' });
      component.addCoin(morgan);
      component.coinRows[0].quantity = 2;
      component.coinRows[0].note = ' 1941 ';

      expect(component.items).toEqual([ring, { coin: morgan, quantity: 2, note: '1941' }]);
      expect(component.describeList(component.items)).toBe('1 piece · 2 coins');

      component.savedLists.save('Lot', component.items);
      component.coinRows = [];
      component.loadList(component.savedLists.lists()[0]);
      expect(component.coinRows.map(row => [row.coin.id, row.quantity, row.note])).toEqual([[morgan, 2, '1941']]);
    });

    it('should open a shared link with coins and show them', async () => {
      await setup({ metals: encodeMetalList([{ coin: eagle, quantity: 1, note: 'birthday' }]) });
      render();
      await fixture.whenStable();

      expect(component.linkNotice).toBe('Loaded a shared list of 1 coin.');
      expect(el().querySelector('.coin-name')?.textContent).toContain('American Gold Eagle');
      expect((el().querySelector('.coin-row .note-input') as HTMLInputElement).value).toBe('birthday');
      expect(component.goldTotals.totalPureToz).toBeCloseTo(eagleToz, 6);
    });

    it('should leave a no-silver coin in a shared link out, with the same hint as the picker', async () => {
      const ike = 'silver-eisenhower-dollar-1971-1978-p-d-copper-nickel';
      await setup({ metals: encodeMetalList([{ coin: eagle, quantity: 1 }, { coin: ike, quantity: 3 }]) });

      expect(component.coinRows.map(row => row.coin.id)).toEqual([eagle]);
      expect(component.linkNotice)
        .toBe('Loaded a shared list of 1 coin. Left out Eisenhower Dollar · 1971-1978 P/D (copper-nickel): no silver.');
    });

    it('should show each coin\'s melt value in its row once there\'s a price', async () => {
      await setup();
      component.spotPrices = { gold: 4000, silver: 50, timestamp: new Date() };
      component.addCoin(morgan);
      const row = component.coinRows[0];

      expect(component.coinMelt(row)).toBe(`$${(morganToz * 50).toFixed(2)} each`);
      row.quantity = 3;
      expect(component.coinMelt(row)).toBe(`$${(morganToz * 50).toFixed(2)} each · $${(morganToz * 50 * 3).toFixed(2)}`);
      row.quantity = 0;
      expect(component.coinMelt(row)).toBeNull();
      component.spotPrices = { gold: -1, silver: -1, timestamp: new Date() };
      row.quantity = 1;
      expect(component.coinMelt(row)).toBeNull();
    });

    it('should describe lists by pieces and coins', () => {
      expect(describeEntries([])).toBe('0 pieces');
      expect(describeEntries([ring, bar])).toBe('2 pieces');
      expect(describeEntries([{ coin: morgan, quantity: 1 }])).toBe('1 coin');
      expect(describeEntries([bar, { coin: morgan, quantity: 3 }, { coin: eagle, quantity: 2 }])).toBe('1 piece · 5 coins');
    });
  });
});

function findCoinPurity(id: string): number {
  return COIN_OPTIONS.find(coin => coin.id === id)!.spec.purity;
}
