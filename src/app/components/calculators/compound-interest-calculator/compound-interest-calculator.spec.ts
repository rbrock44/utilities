import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompoundInterestCalculatorComponent } from './compound-interest-calculator';

type GrowthInputs = Pick<
  CompoundInterestCalculatorComponent,
  'principal' | 'monthlyContribution' | 'rate' | 'years' | 'periodsPerYear'
>;

describe('CompoundInterestCalculatorComponent', () => {
  let component: CompoundInterestCalculatorComponent;
  let fixture: ComponentFixture<CompoundInterestCalculatorComponent>;

  const run = (inputs: Partial<GrowthInputs>) => {
    Object.assign(component, { principal: 0, monthlyContribution: 0, rate: 0, years: 1, periodsPerYear: 12 }, inputs);
    component.calculate();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompoundInterestCalculatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompoundInterestCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should calculate the default example on load', () => {
    expect(component.errorMessage).toBeNull();
    expect(component.yearRows.length).toBe(20);
    // $10,000 + $200/month for 20 years: $58,000 contributed.
    expect(component.summary!.totalContributed).toBe(58000);
    expect(component.summary!.finalBalance).toBeGreaterThan(140000);
  });

  it('should compound monthly with interest rounded to the cent each month', () => {
    // Hand-traced: 1% a month on $1,000, rounding each month's interest, ends at $1,126.84
    // (the unrounded formula gives $1,126.825).
    run({ principal: 1000, rate: 12, years: 1 });

    expect(component.summary!.finalBalance).toBe(1126.84);
    expect(component.summary!.totalInterest).toBe(126.84);
    expect(component.summary!.totalContributed).toBe(1000);
  });

  it('should match the annual compounding formula at each year end', () => {
    run({ principal: 1000, rate: 10, years: 2, periodsPerYear: 1 });

    expect(component.yearRows[0].balance).toBeCloseTo(1100, 1);
    expect(component.summary!.finalBalance).toBeCloseTo(1210, 1);
  });

  it('should grow more with more frequent compounding', () => {
    const balanceWith = (periodsPerYear: number) => {
      run({ principal: 10000, rate: 8, years: 10, periodsPerYear });
      return component.summary!.finalBalance;
    };

    const annually = balanceWith(1);
    const quarterly = balanceWith(4);
    const daily = balanceWith(365);
    expect(annually).toBeLessThan(quarterly);
    expect(quarterly).toBeLessThan(daily);
  });

  it('should only add contributions at 0%', () => {
    run({ monthlyContribution: 100, years: 2 });

    expect(component.summary!.finalBalance).toBe(2400);
    expect(component.summary!.totalInterest).toBe(0);
    expect(component.summary!.doublingYears).toBeNull();
    expect(component.interestShare).toBe(0);
  });

  it('should break growth into yearly rows that add up', () => {
    run({ principal: 5000, monthlyContribution: 100, rate: 6, years: 3 });

    expect(component.yearRows.map(row => row.year)).toEqual([1, 2, 3]);
    expect(component.yearRows.every(row => row.contributions === 1200)).toBe(true);
    const interest = component.yearRows.reduce((sum, row) => sum + row.interest, 0);
    expect(interest).toBeCloseTo(component.summary!.totalInterest, 2);
    expect(component.yearRows[2].balance).toBe(component.summary!.finalBalance);
  });

  it('should end with a partial-year row for fractional years', () => {
    run({ principal: 1000, rate: 5, years: 1.5 });

    expect(component.summary!.months).toBe(18);
    expect(component.yearRows.length).toBe(2);
    expect(component.yearRows[1].year).toBe(2);
  });

  it('should report the doubling time', () => {
    run({ principal: 1000, rate: 7.2, years: 1, periodsPerYear: 1 });
    // ln 2 / ln 1.072 ≈ 9.97, the source of the "rule of 72".
    expect(component.summary!.doublingYears).toBeCloseTo(9.97, 2);
  });

  it('should validate each input', () => {
    run({ principal: -1 });
    expect(component.errorMessage).toBe('Enter a starting amount of zero or more.');
    expect(component.summary).toBeNull();

    run({ principal: 100, monthlyContribution: -5 });
    expect(component.errorMessage).toBe('Enter a monthly contribution of zero or more.');

    run({ principal: 0, monthlyContribution: 0 });
    expect(component.errorMessage).toBe('Enter a starting amount or a monthly contribution.');

    run({ principal: 100, rate: -1 });
    expect(component.errorMessage).toBe('Enter an interest rate of zero or more.');

    run({ principal: 100, years: 0 });
    expect(component.errorMessage).toBe('Enter at least one month of growth.');

    run({ principal: 100, years: 101 });
    expect(component.errorMessage).toBe('That is longer than 100 years.');
  });

  it('should read a cleared number field as zero', () => {
    // A cleared <input type="number"> gives ngModel null, and Number(null) is 0.
    run({ principal: 100, rate: null as unknown as number });
    expect(component.errorMessage).toBeNull();
    expect(component.summary!.totalInterest).toBe(0);
  });

  it('should format money as US dollars', () => {
    expect(component.money(1234.5)).toContain('1,234.50');
  });
});
