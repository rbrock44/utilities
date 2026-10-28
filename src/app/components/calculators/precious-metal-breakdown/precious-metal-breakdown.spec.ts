import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreciousMetalBreakdownComponent } from './precious-metal-breakdown';

describe('PreciousMetalBreakdownComponent', () => {
  let fixture: ComponentFixture<PreciousMetalBreakdownComponent>;

  const breakdown: PreciousMetalBreakdown = {
    type: '14K Gold',
    weightGrams: 31.1035,
    weightToz: 1,
    pureWeightGrams: 18.133,
    pureWeightToz: 0.583,
    spotValue: 1166,
    value90: 1049.4,
    value80: 932.8
  };

  const totals: MetalTotals = {
    totalWeightGrams: 31.1035,
    totalWeightToz: 1,
    totalPureGrams: 18.133,
    totalPureToz: 0.583,
    spotValue: 1166,
    value90: 1049.4,
    value80: 932.8,
    value70: 816.2
  };

  const render = async (inputs: Partial<PreciousMetalBreakdownComponent>) => {
    Object.assign(fixture.componentInstance, inputs);
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreciousMetalBreakdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreciousMetalBreakdownComponent);
  });

  it('should render nothing without breakdowns', async () => {
    const element = await render({ breakdowns: [] });
    expect(element.querySelector('.breakdowns')).toBeNull();
  });

  it('should render a row per breakdown with weights to 3 places and money to 2', async () => {
    const element = await render({ title: 'Gold', breakdowns: [breakdown], totals });

    expect(element.querySelector('h4')?.textContent).toBe('Gold');
    const row = element.querySelectorAll('.breakdown-table-row')[0];
    expect(row.textContent).toContain('14K Gold');
    expect(row.textContent).toContain('1.000 oz t');
    expect(row.textContent).toContain('0.583 oz t');
    expect(row.textContent).toContain('$1166.00');
    expect(row.textContent).toContain('$1049.40');
  });

  it('should show weights and value per unit in the picked unit, and report the pick', async () => {
    const element = await render({ breakdowns: [breakdown], totals, unit: 'dwt' });
    const row = element.querySelectorAll('.breakdown-table-row')[0];

    expect(element.querySelector('.breakdown-table-header')?.textContent).toContain('$/dwt');
    expect(row.textContent).toContain('20.00 dwt');
    expect(row.textContent).toContain('$58.30');

    const picked: MetalUnitId[] = [];
    fixture.componentInstance.unitChange.subscribe(unit => picked.push(unit));
    const select = element.querySelector<HTMLSelectElement>('select')!;
    expect(select.value).toBe('dwt');
    select.value = 'grams';
    select.dispatchEvent(new Event('change'));
    await render({});

    expect(picked).toEqual(['grams']);
    expect(element.querySelectorAll('.breakdown-table-row')[0].textContent).toContain('31.10 g');
  });

  it('should render the totals row with its title and class', async () => {
    const element = await render({
      breakdowns: [breakdown],
      totals,
      totalsTitle: 'Gold Totals',
      totalsClass: 'gold'
    });

    const totalsRow = element.querySelector('.totals-row')!;
    expect(totalsRow.classList).toContain('gold');
    expect(totalsRow.textContent).toContain('Gold Totals');
    expect(totalsRow.textContent).toContain('$932.80');
  });
});
