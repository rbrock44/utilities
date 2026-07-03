import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

interface TriangleSolution {
  a: number;
  b: number;
  c: number;
  angleA: number;
  angleB: number;
}

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
  angleA = 0;
  angleB = 0;

  solution: TriangleSolution | null = null;
  solvedFields = new Set<string>();
  errorMessage: string | null = null;

  onInputChange(): void {
    this.solution = null;
    this.solvedFields = new Set();
    this.errorMessage = null;
  }

  isSolved(field: string): boolean {
    return this.solvedFields.has(field);
  }

  calculate(): void {
    this.solution = null;
    this.solvedFields = new Set();
    this.errorMessage = null;

    const a = this.sideA;
    const b = this.sideB;
    const c = this.sideC;
    const A = this.angleA;
    const B = this.angleB;

    if (!this.isNonNeg(a) || !this.isNonNeg(b) || !this.isNonNeg(c)) {
      this.errorMessage = 'Side values must be numbers ≥ 0.';
      return;
    }
    if (!this.isNonNeg(A) || !this.isNonNeg(B)) {
      this.errorMessage = 'Angle values must be numbers ≥ 0.';
      return;
    }
    if ((A > 0 && A >= 90) || (B > 0 && B >= 90)) {
      this.errorMessage = 'Angles A and B must each be less than 90°.';
      return;
    }
    if (A > 0 && B > 0 && Math.abs(A + B - 90) > 0.001) {
      this.errorMessage = 'Angles A and B must sum to 90°.';
      return;
    }

    const hasA = a > 0;
    const hasB = b > 0;
    const hasC = c > 0;
    const hasAngA = A > 0;
    const hasAngB = B > 0;
    const sideCount = Number(hasA) + Number(hasB) + Number(hasC);
    const angleCount = Number(hasAngA) + Number(hasAngB);

    let sol: TriangleSolution | null = null;
    let fields = new Set<string>();

    if (sideCount === 2 && angleCount === 0) {
      [sol, fields] = this.solveTwoSides(hasA, hasB, hasC, a, b, c);
    } else if (sideCount === 1 && angleCount === 1) {
      [sol, fields] = this.solveSideAndAngle(hasA, hasB, hasC, hasAngA, hasAngB, a, b, c, A, B);
    } else {
      this.errorMessage = 'Enter exactly two sides, or one side and one angle (A or B). Leave unknowns as 0.';
    }

    if (sol !== null) {
      this.solution = sol;
      this.solvedFields = fields;
      this.sideA = sol.a;
      this.sideB = sol.b;
      this.sideC = sol.c;
      this.angleA = sol.angleA;
      this.angleB = sol.angleB;
    }
  }

  private solveTwoSides(hasA: boolean, hasB: boolean, hasC: boolean, a: number, b: number, c: number): [TriangleSolution | null, Set<string>] {
    if (!hasC) {
      const solvedC = Math.sqrt(a * a + b * b);
      const solvedA = Math.atan2(a, b) * DEG;
      return [{ a, b, c: solvedC, angleA: solvedA, angleB: 90 - solvedA }, new Set(['c', 'A', 'B'])];
    }

    if (!hasA) {
      if (c <= b) { this.errorMessage = 'Hypotenuse c must be greater than side b.'; return [null, new Set()]; }
      const solvedA = Math.sqrt(c * c - b * b);
      const solvedAngB = Math.asin(b / c) * DEG;
      return [{ a: solvedA, b, c, angleA: 90 - solvedAngB, angleB: solvedAngB }, new Set(['a', 'A', 'B'])];
    }

    if (c <= a) { this.errorMessage = 'Hypotenuse c must be greater than side a.'; return [null, new Set()]; }
    const solvedB = Math.sqrt(c * c - a * a);
    const solvedAngA = Math.asin(a / c) * DEG;
    return [{ a, b: solvedB, c, angleA: solvedAngA, angleB: 90 - solvedAngA }, new Set(['b', 'A', 'B'])];
  }

  private solveSideAndAngle(
    hasA: boolean, hasB: boolean, hasC: boolean,
    hasAngA: boolean, hasAngB: boolean,
    a: number, b: number, c: number, A: number, B: number
  ): [TriangleSolution | null, Set<string>] {
    const angA = hasAngA ? A : 90 - B;
    const angB = 90 - angA;

    if (angA <= 0 || angA >= 90) {
      this.errorMessage = 'Derived angle must be between 0° and 90°.';
      return [null, new Set()];
    }

    const aRad = angA * RAD;
    const solvedAngleField = hasAngA ? 'B' : 'A';

    if (hasA) {
      return [{ a, b: a / Math.tan(aRad), c: a / Math.sin(aRad), angleA: angA, angleB: angB }, new Set(['b', 'c', solvedAngleField])];
    }
    if (hasB) {
      return [{ a: b * Math.tan(aRad), b, c: b / Math.cos(aRad), angleA: angA, angleB: angB }, new Set(['a', 'c', solvedAngleField])];
    }
    return [{ a: c * Math.sin(aRad), b: c * Math.cos(aRad), c, angleA: angA, angleB: angB }, new Set(['a', 'b', solvedAngleField])];
  }

  private isNonNeg(value: number | null): value is number {
    return value !== null && Number.isFinite(value) && value >= 0;
  }
}
