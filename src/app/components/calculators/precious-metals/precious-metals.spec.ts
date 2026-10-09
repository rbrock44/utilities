import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreciousMetalsComponent } from './precious-metals';
import { goldTypes, silverTypes } from '../../../constants/constants';

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
