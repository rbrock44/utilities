import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/** IRC R311.7.5 limits for residential stairs, in inches. */
export const MAX_RISER = 7.75;
export const MIN_TREAD = 10;
/** Common dimensional lumber lengths, in feet. */
const BOARD_LENGTHS_FT = [8, 10, 12, 14, 16, 18, 20];

export interface StairLayout {
  risers: number;
  treads: number;
  riserHeight: number;
  totalRun: number;
  stringerLength: number;
  angle: number;
  bottomRiserCut: number;
  boardLengthFt: number | null;
  stepComfort: number;
}

export interface CodeCheck {
  label: string;
  pass: boolean;
}

@Component({
  selector: 'app-stair-stringer-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stair-stringer-calculator.html',
  styleUrl: './stair-stringer-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StairStringerCalculatorComponent {
  totalRise: number | null = null;
  targetRiser: number | null = 7.5;
  treadDepth: number | null = 10;
  treadThickness: number | null = 1;

  get hasRequiredInputs(): boolean {
    return this.totalRise !== null && this.targetRiser !== null && this.treadDepth !== null;
  }

  get errorMessage(): string | null {
    if (!this.hasRequiredInputs) {
      return null;
    }
    if (!this.isPositive(this.totalRise)) {
      return 'Total rise must be greater than 0.';
    }
    if (!this.isPositive(this.targetRiser)) {
      return 'Target riser height must be greater than 0.';
    }
    if (!this.isPositive(this.treadDepth)) {
      return 'Tread depth must be greater than 0.';
    }

    const thickness = this.treadThickness ?? 0;
    if (!Number.isFinite(thickness) || thickness < 0) {
      return 'Tread thickness can\'t be negative.';
    }
    const riserHeight = this.totalRise! / this.riserCount(this.totalRise!, this.targetRiser!);
    if (thickness >= riserHeight) {
      return 'Tread thickness must be less than the riser height.';
    }
    return null;
  }

  get layout(): StairLayout | null {
    if (!this.hasRequiredInputs || this.errorMessage !== null) {
      return null;
    }

    const totalRise = this.totalRise!;
    const treadDepth = this.treadDepth!;
    const risers = this.riserCount(totalRise, this.targetRiser!);
    const riserHeight = totalRise / risers;
    // The top riser lands on the upper floor, so there is one fewer tread than riser.
    const treads = risers - 1;
    const totalRun = treads * treadDepth;
    const stringerLength = Math.hypot(totalRise, totalRun);

    return {
      risers,
      treads,
      riserHeight,
      totalRun,
      stringerLength,
      angle: Math.atan2(riserHeight, treadDepth) * 180 / Math.PI,
      // The first tread adds its thickness to the bottom step, so that riser is cut shorter.
      bottomRiserCut: riserHeight - (this.treadThickness ?? 0),
      boardLengthFt: BOARD_LENGTHS_FT.find(feet => feet * 12 >= stringerLength) ?? null,
      stepComfort: 2 * riserHeight + treadDepth,
    };
  }

  get codeChecks(): CodeCheck[] {
    const layout = this.layout;
    if (!layout) {
      return [];
    }

    return [
      { label: `Riser height ≤ ${this.formatInches(MAX_RISER)}`, pass: layout.riserHeight <= MAX_RISER + 1e-9 },
      { label: `Tread depth ≥ ${this.formatInches(MIN_TREAD)}`, pass: this.treadDepth! >= MIN_TREAD },
      { label: 'Comfortable step (2 × riser + tread between 24″ and 25″)', pass: layout.stepComfort >= 24 && layout.stepComfort <= 25 },
    ];
  }

  /** Inches rounded to the nearest 1/16, the finest mark on a typical tape measure. */
  formatInches(value: number): string {
    const sixteenths = Math.round(value * 16);
    const whole = Math.floor(sixteenths / 16);
    let numerator = sixteenths % 16;
    let denominator = 16;
    while (numerator > 0 && numerator % 2 === 0) {
      numerator /= 2;
      denominator /= 2;
    }

    if (numerator === 0) {
      return `${whole}″`;
    }
    return whole === 0 ? `${numerator}/${denominator}″` : `${whole} ${numerator}/${denominator}″`;
  }

  formatFeet(inches: number): string {
    // Round first so 143.99″ reads 12′ 0″, not 11′ 12″.
    const rounded = Math.round(inches * 16) / 16;
    const feet = Math.floor(rounded / 12);
    return `${feet}′ ${this.formatInches(rounded - feet * 12)}`;
  }

  formatDegrees(value: number): string {
    return `${value.toFixed(1)}°`;
  }

  /**
   * Rounds to the riser count closest to the target, then adds risers until each one is
   * within the code maximum.
   */
  private riserCount(totalRise: number, targetRiser: number): number {
    let risers = Math.max(1, Math.round(totalRise / targetRiser));
    while (totalRise / risers > MAX_RISER) {
      risers++;
    }
    return risers;
  }

  private isPositive(value: number | null): boolean {
    return value !== null && Number.isFinite(value) && value > 0;
  }
}
