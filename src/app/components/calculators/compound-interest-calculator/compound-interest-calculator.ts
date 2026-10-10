import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface YearRow {
  year: number;
  contributions: number;
  interest: number;
  balance: number;
}

export interface GrowthSummary {
  finalBalance: number;
  totalContributed: number;
  totalInterest: number;
  months: number;
  /** Years for money left alone to double at this rate, or null when it never does. */
  doublingYears: number | null;
}

export const COMPOUNDING_OPTIONS = [
  { label: 'Annually', periods: 1 },
  { label: 'Quarterly', periods: 4 },
  { label: 'Monthly', periods: 12 },
  { label: 'Daily', periods: 365 },
];

const MAX_YEARS = 100;

@Component({
  selector: 'app-compound-interest-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './compound-interest-calculator.html',
  styleUrl: './compound-interest-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompoundInterestCalculatorComponent implements OnInit {
  principal = 10000;
  monthlyContribution = 200;
  rate = 7;
  years = 20;
  periodsPerYear = 12;

  readonly compoundingOptions = COMPOUNDING_OPTIONS;
  summary: GrowthSummary | null = null;
  yearRows: YearRow[] = [];
  errorMessage: string | null = null;

  private readonly currency = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  });

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.calculate();
  }

  get interestShare(): number {
    if (this.summary === null || this.summary.finalBalance === 0) {
      return 0;
    }
    return (this.summary.totalInterest / this.summary.finalBalance) * 100;
  }

  money(value: number): string {
    return this.currency.format(value);
  }

  calculate(): void {
    this.errorMessage = this.validate();
    this.summary = null;
    this.yearRows = [];

    if (this.errorMessage === null) {
      this.build();
    }
    this.cdr.markForCheck();
  }

  private validate(): string | null {
    const principal = Number(this.principal);
    const contribution = Number(this.monthlyContribution);
    const rate = Number(this.rate);
    const years = Number(this.years);

    if (!Number.isFinite(principal) || principal < 0) {
      return 'Enter a starting amount of zero or more.';
    }
    if (!Number.isFinite(contribution) || contribution < 0) {
      return 'Enter a monthly contribution of zero or more.';
    }
    if (principal === 0 && contribution === 0) {
      return 'Enter a starting amount or a monthly contribution.';
    }
    if (!Number.isFinite(rate) || rate < 0) {
      return 'Enter an interest rate of zero or more.';
    }
    if (!Number.isFinite(years) || Math.round(years * 12) < 1) {
      return 'Enter at least one month of growth.';
    }
    if (years > MAX_YEARS) {
      return `That is longer than ${MAX_YEARS} years.`;
    }
    return null;
  }

  /**
   * Steps month by month in integer cents, rounding each month's interest the way an account
   * statement would. Compounding frequency sets the effective monthly rate,
   * (1 + r/n)^(n/12) - 1, so balances match the textbook formula at every compounding date
   * while monthly contributions still earn from the month they land.
   */
  private build(): void {
    const annualRate = Number(this.rate) / 100;
    const periods = Number(this.periodsPerYear);
    const months = Math.round(Number(this.years) * 12);
    const monthlyRate = Math.pow(1 + annualRate / periods, periods / 12) - 1;
    const contributionCents = Math.round(Number(this.monthlyContribution) * 100);

    let balance = Math.round(Number(this.principal) * 100);
    let totalContributed = balance;
    let totalInterest = 0;
    let yearContributions = 0;
    let yearInterest = 0;
    const rows: YearRow[] = [];

    for (let month = 1; month <= months; month++) {
      const interest = Math.round(balance * monthlyRate);
      // Contributions land at the end of the month, after that month's interest.
      balance += interest + contributionCents;
      totalInterest += interest;
      totalContributed += contributionCents;
      yearInterest += interest;
      yearContributions += contributionCents;

      if (month % 12 === 0 || month === months) {
        rows.push({
          year: Math.ceil(month / 12),
          contributions: yearContributions / 100,
          interest: yearInterest / 100,
          balance: balance / 100,
        });
        yearContributions = 0;
        yearInterest = 0;
      }
    }

    this.yearRows = rows;
    this.summary = {
      finalBalance: balance / 100,
      totalContributed: totalContributed / 100,
      totalInterest: totalInterest / 100,
      months,
      doublingYears: annualRate > 0 ? Math.log(2) / (periods * Math.log(1 + annualRate / periods)) : null,
    };
  }
}
