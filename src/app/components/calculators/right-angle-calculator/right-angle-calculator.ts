import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Side = 'a' | 'b' | 'c';

@Component({
  selector: 'app-right-angle-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './right-angle-calculator.html',
  styleUrl: './right-angle-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RightAngleCalculatorComponent {
  sideA = 0;
  sideB = 0;
  sideC = 0;

  solvedSide: Side | null = null;
  result: number | null = null;
  errorMessage: string | null = null;

  onInputChange(): void {
    this.solvedSide = null;
    this.result = null;
    this.errorMessage = null;
  }

  calculate(): void {
    this.solvedSide = null;
    this.result = null;
    this.errorMessage = null;

    const a = this.sideA;
    const b = this.sideB;
    const c = this.sideC;

    if (!this.isNonNegativeNumber(a) || !this.isNonNegativeNumber(b) || !this.isNonNegativeNumber(c)) {
      this.errorMessage = 'All side values must be numbers greater than or equal to 0.';
      return;
    }

    const zeroCount = Number(a === 0) + Number(b === 0) + Number(c === 0);
    if (zeroCount !== 1) {
      this.errorMessage = 'Set exactly one side to 0 and the other two sides to values greater than 0.';
      return;
    }

    if (c === 0) {
      if (!this.isPositive(a) || !this.isPositive(b)) {
        this.errorMessage = 'Enter positive values for sides a and b.';
        return;
      }

      this.result = Math.sqrt((a * a) + (b * b));
      this.sideC = this.result;
      this.solvedSide = 'c';
      return;
    }

    if (a === 0) {
      if (!this.isPositive(b) || !this.isPositive(c)) {
        this.errorMessage = 'Enter positive values for sides b and c.';
        return;
      }

      if (c <= b) {
        this.errorMessage = 'Side c (hypotenuse) must be greater than side b.';
        return;
      }

      this.result = Math.sqrt((c * c) - (b * b));
      this.sideA = this.result;
      this.solvedSide = 'a';
      return;
    }

    if (!this.isPositive(a) || !this.isPositive(c)) {
      this.errorMessage = 'Enter positive values for sides a and c.';
      return;
    }

    if (c <= a) {
      this.errorMessage = 'Side c (hypotenuse) must be greater than side a.';
      return;
    }

    this.result = Math.sqrt((c * c) - (a * a));
    this.sideB = this.result;
    this.solvedSide = 'b';
  }

  get solvedFormula(): string {
    if (this.solvedSide === 'c') {
      return 'c = sqrt(a^2 + b^2)';
    }

    if (this.solvedSide === 'a') {
      return 'a = sqrt(c^2 - b^2)';
    }

    if (this.solvedSide === 'b') {
      return 'b = sqrt(c^2 - a^2)';
    }

    return '';
  }

  private isNonNegativeNumber(value: number | null): value is number {
    return value !== null && Number.isFinite(value) && value >= 0;
  }

  private isPositive(value: number | null): value is number {
    return value !== null && Number.isFinite(value) && value > 0;
  }
}
