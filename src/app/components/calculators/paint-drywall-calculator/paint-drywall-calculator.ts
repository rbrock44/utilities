import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/** Standard 3′ × 7′ interior door and 3′ × 5′ window, in square feet. */
export const DOOR_SQFT = 21;
export const WINDOW_SQFT = 15;

export const SHEET_SIZES = [
  { label: '4′ × 8′', sqft: 32 },
  { label: '4′ × 10′', sqft: 40 },
  { label: '4′ × 12′', sqft: 48 },
];

export interface PaintAmount {
  gallons: number;
  /** What to buy, rounded up to whole quarts. */
  buyLabel: string;
}

export interface CoverageResult {
  wallArea: number;
  openingsArea: number;
  ceilingArea: number;
  walls: PaintAmount;
  ceiling: PaintAmount | null;
  drywallArea: number;
  sheets: number;
}

/** Rounds up to the quart, since that's the smallest can most paint comes in. */
export function paintAmount(area: number, coats: number, coveragePerGallon: number): PaintAmount {
  const gallons = (area * coats) / coveragePerGallon;
  const quarts = Math.ceil(gallons * 4 - 1e-9);
  const whole = Math.floor(quarts / 4);
  const extra = quarts % 4;
  const parts = [
    whole > 0 ? `${whole} gal` : '',
    extra > 0 ? `${extra} qt` : '',
  ].filter(Boolean);
  return { gallons, buyLabel: parts.length > 0 ? parts.join(' + ') : 'None' };
}

@Component({
  selector: 'app-paint-drywall-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paint-drywall-calculator.html',
  styleUrl: './paint-drywall-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaintDrywallCalculatorComponent {
  length: number | null = 12;
  width: number | null = 10;
  height: number | null = 8;
  doors: number | null = 1;
  windows: number | null = 2;
  includeCeiling = true;
  coats: number | null = 2;
  coverage: number | null = 350;
  sheetSqft = 32;
  wastePercent: number | null = 10;

  readonly sheetSizes = SHEET_SIZES;

  get errorMessage(): string | null {
    const dimensions = [this.length, this.width, this.height];
    if (dimensions.some(value => !this.isPositive(value))) {
      return 'Room length, width, and height must all be greater than 0.';
    }
    if (!this.isWholeOrZero(this.doors) || !this.isWholeOrZero(this.windows)) {
      return 'Doors and windows must be whole numbers, 0 or more.';
    }
    if (!this.isPositive(this.coats) || !Number.isInteger(this.coats)) {
      return 'Coats must be a whole number, 1 or more.';
    }
    if (!this.isPositive(this.coverage)) {
      return 'Coverage per gallon must be greater than 0.';
    }
    if (this.wastePercent === null || !Number.isFinite(this.wastePercent) || this.wastePercent < 0) {
      return 'Waste must be 0% or more.';
    }
    if (this.openingsArea > this.wallArea) {
      return 'The doors and windows cover more than the walls.';
    }
    return null;
  }

  get result(): CoverageResult | null {
    if (this.errorMessage !== null) {
      return null;
    }

    const paintedWalls = this.wallArea - this.openingsArea;
    const ceilingArea = this.includeCeiling ? this.length! * this.width! : 0;
    const drywallArea = paintedWalls + ceilingArea;

    return {
      wallArea: this.wallArea,
      openingsArea: this.openingsArea,
      ceilingArea,
      walls: paintAmount(paintedWalls, this.coats!, this.coverage!),
      // Ceilings usually get their own flat white, so they're bought separately.
      ceiling: this.includeCeiling ? paintAmount(ceilingArea, this.coats!, this.coverage!) : null,
      drywallArea,
      sheets: Math.ceil((drywallArea * (1 + this.wastePercent! / 100)) / this.sheetSqft - 1e-9),
    };
  }

  formatArea(sqft: number): string {
    return `${Math.round(sqft).toLocaleString()} sq ft`;
  }

  private get wallArea(): number {
    return 2 * ((this.length ?? 0) + (this.width ?? 0)) * (this.height ?? 0);
  }

  private get openingsArea(): number {
    return (this.doors ?? 0) * DOOR_SQFT + (this.windows ?? 0) * WINDOW_SQFT;
  }

  private isPositive(value: number | null): boolean {
    return value !== null && Number.isFinite(value) && value > 0;
  }

  private isWholeOrZero(value: number | null): boolean {
    return value !== null && Number.isInteger(value) && value >= 0;
  }
}
