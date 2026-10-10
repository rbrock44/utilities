import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { PreciousMetalsComponent } from './precious-metals';
import { goldTypes, silverTypes } from '../../../constants/constants';
import { SpotPriceService } from '../../../services/spot-price';
import { encodeMetalList, MetalListItem } from './metal-list';

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

  const setup = async (query: Record<string, string> = {}) => {
    await TestBed.configureTestingModule({
      imports: [PreciousMetalsComponent],
      providers: [
        { provide: SpotPriceService, useValue: { getSpotPrices: () => of({ gold: 2000, silver: 25, timestamp: new Date() }) } },
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
});
