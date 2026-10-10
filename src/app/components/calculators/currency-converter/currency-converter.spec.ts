import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CurrencyConverterComponent } from './currency-converter';
import { ExchangeRateService, ExchangeRates } from '../../../services/exchange-rate';
import { UnitConverterComponent } from '../unit-converter/unit-converter';

describe('CurrencyConverterComponent', () => {
  let component: CurrencyConverterComponent;
  let fixture: ComponentFixture<CurrencyConverterComponent>;

  const setup = async (rates: ExchangeRates) => {
    // toUnitDefinitions is pure, so the real one is used; only the HTTP call is faked.
    const real = new ExchangeRateService(null as never);
    await TestBed.configureTestingModule({
      imports: [CurrencyConverterComponent],
      providers: [{
        provide: ExchangeRateService,
        useValue: {
          getRates: () => of(rates),
          toUnitDefinitions: (r: ExchangeRates) => real.toUnitDefinitions(r)
        }
      }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrencyConverterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('should turn loaded rates into sorted currency units', async () => {
    await setup({ base: 'USD', rates: { USD: 1, EUR: 0.5, CAD: 1.25 }, timestamp: new Date('2026-01-02') });

    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBeNull();
    expect(component.units.map(u => u.id)).toEqual(['CAD', 'EUR', 'USD']);
    expect(component.updatedAt).toEqual(new Date('2026-01-02'));
  });

  it('should convert between two non-base currencies through the base', async () => {
    await setup({ base: 'USD', rates: { USD: 1, EUR: 0.5, CAD: 1.25 }, timestamp: new Date() });

    const eur = component.units.find(u => u.id === 'EUR')!;
    const cad = component.units.find(u => u.id === 'CAD')!;
    expect(cad.fromBase(eur.toBase(10))).toBeCloseTo(25);
  });

  it('should hand the currencies to the unit converter', async () => {
    await setup({ base: 'USD', rates: { USD: 1, EUR: 0.5 }, timestamp: new Date() });
    fixture.detectChanges();

    const converter = fixture.debugElement.query(d => d.componentInstance instanceof UnitConverterComponent);
    expect((converter.componentInstance as UnitConverterComponent).units.length).toBe(2);
  });

  it('should show an error when no rates come back', async () => {
    await setup({ base: 'USD', rates: {}, timestamp: new Date() });

    expect(component.loading).toBe(false);
    expect(component.errorMessage).toContain('Unable to load exchange rates');
    expect(component.units).toEqual([]);
  });
});
