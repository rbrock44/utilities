import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type TermUnit = 'years' | 'months';

interface ScheduleRow {
  index: number;
  dateLabel: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

interface Summary {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  payoffLabel: string;
  months: number;
}

const MAX_MONTHS = 1200;
const PREVIEW_ROWS = 12;

@Component({
  selector: 'app-loan-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loan-calculator.html',
  styleUrl: './loan-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanCalculatorComponent implements OnInit {
  amount = 250000;
  rate = 6.5;
  term = 30;
  termUnit: TermUnit = 'years';
  startDate = '';

  summary: Summary | null = null;
  schedule: ScheduleRow[] = [];
  showAll = false;
  errorMessage: string | null = null;

  private readonly currency = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  });

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    const today = new Date();
    this.startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    this.calculate();
  }

  get visibleSchedule(): ScheduleRow[] {
    return this.showAll ? this.schedule : this.schedule.slice(0, PREVIEW_ROWS);
  }

  get hiddenCount(): number {
    return Math.max(0, this.schedule.length - PREVIEW_ROWS);
  }

  get interestShare(): number {
    if (this.summary === null || this.summary.totalPaid === 0) {
      return 0;
    }
    return (this.summary.totalInterest / this.summary.totalPaid) * 100;
  }

  money(value: number): string {
    return this.currency.format(value);
  }

  toggleAll(): void {
    this.showAll = !this.showAll;
    this.cdr.markForCheck();
  }

  calculate(): void {
    this.errorMessage = null;
    this.summary = null;
    this.schedule = [];
    this.showAll = false;

    const amount = Number(this.amount);
    const rate = Number(this.rate);
    const term = Number(this.term);

    if (!Number.isFinite(amount) || amount <= 0) {
      this.errorMessage = 'Enter a loan amount greater than zero.';
      this.cdr.markForCheck();
      return;
    }

    if (!Number.isFinite(rate) || rate < 0) {
      this.errorMessage = 'Enter an interest rate of zero or more.';
      this.cdr.markForCheck();
      return;
    }

    if (!Number.isFinite(term) || term <= 0) {
      this.errorMessage = 'Enter a loan term greater than zero.';
      this.cdr.markForCheck();
      return;
    }

    const months = Math.round(this.termUnit === 'years' ? term * 12 : term);

    if (months < 1) {
      this.errorMessage = 'That term is shorter than a single monthly payment.';
      this.cdr.markForCheck();
      return;
    }

    if (months > MAX_MONTHS) {
      this.errorMessage = `That term is longer than ${MAX_MONTHS / 12} years.`;
      this.cdr.markForCheck();
      return;
    }

    this.build(Math.round(amount * 100), rate / 100 / 12, months);
    this.cdr.markForCheck();
  }

  /**
   * Runs the whole schedule in integer cents so rounding never drifts, then
   * trues up the final payment against whatever balance is actually left.
   */
  private build(principalCents: number, monthlyRate: number, months: number): void {
    const paymentCents =
      monthlyRate === 0
        ? Math.round(principalCents / months)
        : Math.round(
            (principalCents * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
          );

    const rows: ScheduleRow[] = [];
    const start = this.parseStart();

    let balance = principalCents;
    let totalInterest = 0;
    let totalPaid = 0;

    for (let index = 1; index <= months && balance > 0; index++) {
      const interest = Math.round(balance * monthlyRate);
      let principal = paymentCents - interest;
      let payment = paymentCents;

      if (index === months || principal >= balance) {
        principal = balance;
        payment = principal + interest;
      }

      balance -= principal;
      totalInterest += interest;
      totalPaid += payment;

      rows.push({
        index,
        dateLabel: this.monthLabel(start, index - 1),
        payment: payment / 100,
        principal: principal / 100,
        interest: interest / 100,
        balance: balance / 100,
      });
    }

    this.schedule = rows;
    this.summary = {
      monthlyPayment: paymentCents / 100,
      totalPaid: totalPaid / 100,
      totalInterest: totalInterest / 100,
      payoffLabel: rows.length > 0 ? rows[rows.length - 1].dateLabel : '',
      months: rows.length,
    };
  }

  private parseStart(): Date | null {
    if (!this.startDate) {
      return null;
    }

    const [year, month] = this.startDate.split('-').map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return null;
    }

    return new Date(year, month - 1, 1);
  }

  private monthLabel(start: Date | null, offset: number): string {
    if (start === null) {
      return `Month ${offset + 1}`;
    }

    const date = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }
}
