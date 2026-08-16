import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanCalculatorComponent } from './loan-calculator';

describe('LoanCalculatorComponent', () => {
  let component: LoanCalculatorComponent;
  let fixture: ComponentFixture<LoanCalculatorComponent>;

  const setLoan = (amount: number, rate: number, term: number, unit: 'years' | 'months' = 'years') => {
    component.amount = amount;
    component.rate = rate;
    component.term = term;
    component.termUnit = unit;
    component.calculate();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanCalculatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute the standard amortized monthly payment', () => {
    setLoan(250000, 6.5, 30);

    // 250k at 6.5% over 30 years is a well-known $1,580.17 payment.
    expect(component.summary!.monthlyPayment).toBeCloseTo(1580.17, 2);
  });

  it('should produce one row per month', () => {
    setLoan(250000, 6.5, 30);

    expect(component.schedule.length).toBe(360);
    expect(component.summary!.months).toBe(360);
  });

  it('should pay the balance down to exactly zero', () => {
    setLoan(250000, 6.5, 30);

    const last = component.schedule[component.schedule.length - 1];
    expect(last.balance).toBe(0);
  });

  it('should have total paid equal principal plus interest', () => {
    setLoan(250000, 6.5, 30);
    const summary = component.summary!;

    expect(summary.totalPaid).toBeCloseTo(250000 + summary.totalInterest, 2);
  });

  it('should split each payment into principal and interest', () => {
    setLoan(250000, 6.5, 30);
    const first = component.schedule[0];

    expect(first.principal + first.interest).toBeCloseTo(first.payment, 2);
    // Month one on a long mortgage is mostly interest.
    expect(first.interest).toBeGreaterThan(first.principal);
  });

  it('should handle a zero-interest loan as a simple division', () => {
    setLoan(1200, 0, 12, 'months');

    expect(component.summary!.monthlyPayment).toBeCloseTo(100, 2);
    expect(component.summary!.totalInterest).toBeCloseTo(0, 2);
    expect(component.summary!.totalPaid).toBeCloseTo(1200, 2);
  });

  it('should accept a term given in months', () => {
    setLoan(10000, 5, 36, 'months');

    expect(component.schedule.length).toBe(36);
  });

  it('should reject a non-positive loan amount', () => {
    setLoan(0, 6.5, 30);

    expect(component.errorMessage).toBeTruthy();
    expect(component.summary).toBeNull();
  });

  it('should reject a negative interest rate', () => {
    setLoan(250000, -1, 30);

    expect(component.errorMessage).toBeTruthy();
    expect(component.summary).toBeNull();
  });

  it('should reject a term beyond the supported range', () => {
    setLoan(250000, 6.5, 101);

    expect(component.errorMessage).toContain('longer than');
    expect(component.summary).toBeNull();
  });

  it('should preview 12 rows until expanded', () => {
    setLoan(250000, 6.5, 30);

    expect(component.visibleSchedule.length).toBe(12);
    expect(component.hiddenCount).toBe(348);

    component.toggleAll();
    expect(component.visibleSchedule.length).toBe(360);
  });

  it('should report the interest share of the total paid', () => {
    setLoan(250000, 6.5, 30);

    expect(component.interestShare).toBeGreaterThan(0);
    expect(component.interestShare).toBeLessThan(100);
  });
});
