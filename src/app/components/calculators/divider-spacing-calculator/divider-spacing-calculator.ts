import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DividerPlacement {
  index: number;
  start: number;
  center: number;
  end: number;
}

interface SpacingResult {
  clearGap: number;
  placements: DividerPlacement[];
}

@Component({
  selector: 'app-divider-spacing-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './divider-spacing-calculator.html',
  styleUrl: './divider-spacing-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DividerSpacingCalculatorComponent {
  private readonly svgFrameStart = 20;

  overallWidth: number | null = null;
  materialWidth: number | null = null;
  dividerCount: number | null = null;
  includeEnds = true;
  isPlacementTableExpanded = false;

  togglePlacementTable(): void {
    this.isPlacementTableExpanded = !this.isPlacementTableExpanded;
  }

  get hasRequiredInputs(): boolean {
    return this.overallWidth !== null && this.materialWidth !== null && this.dividerCount !== null;
  }

  get errorMessage(): string | null {
    const overallWidth = this.overallWidth;
    const materialWidth = this.materialWidth;
    const dividerCount = this.dividerCount;

    if (overallWidth === null || materialWidth === null || dividerCount === null) {
      return null;
    }

    if (!Number.isFinite(overallWidth) || overallWidth <= 0) {
      return 'Overall width must be greater than 0.';
    }

    if (!Number.isFinite(materialWidth) || materialWidth <= 0) {
      return 'Material width must be greater than 0.';
    }

    if (!Number.isFinite(dividerCount) || dividerCount < 1) {
      return 'Divider count must be at least 1.';
    }

    if (!Number.isInteger(dividerCount)) {
      return 'Divider count must be a whole number.';
    }

    const requiredMaterialWidth = dividerCount * materialWidth;
    if (requiredMaterialWidth > overallWidth) {
      return 'Material total width is larger than the overall width.';
    }

    if (this.includeEnds && dividerCount > 1 && requiredMaterialWidth === overallWidth) {
      return null;
    }

    const gapCount = this.includeEnds
      ? Math.max(dividerCount - 1, 1)
      : dividerCount + 1;

    const clearGap = (overallWidth - requiredMaterialWidth) / gapCount;
    if (clearGap < 0) {
      return 'Inputs produce a negative spacing value. Increase overall width or lower divider/material values.';
    }

    return null;
  }

  get spacingResult(): SpacingResult | null {
    if (!this.hasRequiredInputs || this.errorMessage !== null) {
      return null;
    }

    const overallWidth = this.overallWidth as number;
    const materialWidth = this.materialWidth as number;
    const dividerCount = this.dividerCount as number;

    const requiredMaterialWidth = dividerCount * materialWidth;
    const gapCount = this.includeEnds
      ? Math.max(dividerCount - 1, 1)
      : dividerCount + 1;
    const clearGap = (overallWidth - requiredMaterialWidth) / gapCount;

    const placements: DividerPlacement[] = [];

    for (let index = 0; index < dividerCount; index += 1) {
      const start = this.includeEnds
        ? index * (materialWidth + clearGap)
        : clearGap + (index * (materialWidth + clearGap));

      placements.push({
        index: index + 1,
        start,
        center: start + (materialWidth / 2),
        end: start + materialWidth
      });
    }

    return {
      clearGap,
      placements
    };
  }

  get viewDividerPlacements(): DividerPlacement[] {
    return this.spacingResult?.placements ?? [];
  }

  get svgDividerPlacements(): DividerPlacement[] {
    return this.viewDividerPlacements.map((placement) => ({
      ...placement,
      start: this.toSvgX(placement.start),
      center: this.toSvgX(placement.center),
      end: this.toSvgX(placement.end)
    }));
  }

  get svgMaterialWidth(): number {
    if (this.materialWidth === null) {
      return 0;
    }

    return this.toSvgLength(this.materialWidth);
  }

  get firstDividerStart(): number {
    return this.svgDividerPlacements[0]?.start ?? this.svgFrameStart;
  }

  get firstDividerEnd(): number {
    return this.svgDividerPlacements[0]?.end ?? this.svgFrameStart;
  }

  get firstDividerCenter(): number {
    return (this.firstDividerStart + this.firstDividerEnd) / 2;
  }

  get materialMeasurementLabel(): string {
    return this.materialWidth === null ? '0' : this.formatNumber(this.materialWidth);
  }

  get showGapMeasurement(): boolean {
    if (this.spacingResult === null || this.svgDividerPlacements.length === 0) {
      return false;
    }

    return this.includeEnds
      ? this.svgDividerPlacements.length > 1
      : this.svgDividerPlacements.length > 0;
  }

  get gapStart(): number {
    if (!this.showGapMeasurement) {
      return this.svgFrameStart;
    }

    if (!this.includeEnds) {
      return this.svgFrameStart;
    }

    return this.firstDividerEnd;
  }

  get gapEnd(): number {
    if (!this.showGapMeasurement) {
      return this.svgFrameStart;
    }

    if (!this.includeEnds) {
      return this.firstDividerStart;
    }

    return this.svgDividerPlacements[1]?.start ?? this.firstDividerEnd;
  }

  get gapCenter(): number {
    return (this.gapStart + this.gapEnd) / 2;
  }

  get gapMeasurementLabel(): string {
    return this.formatNumber(this.spacingResult?.clearGap ?? 0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2
    }).format(value);
  }

  private toSvgX(value: number): number {
    return 20 + this.toSvgLength(value);
  }

  private toSvgLength(value: number): number {
    if (this.overallWidth === null || this.overallWidth <= 0) {
      return 0;
    }

    const drawableWidth = 520;
    return (value / this.overallWidth) * drawableWidth;
  }
}
