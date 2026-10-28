import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { emptyMetalTotal, findMetalUnit, METAL_UNITS } from '../../../constants/constants';

@Component({
  selector: 'app-precious-metal-breakdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './precious-metal-breakdown.html',
  styleUrls: ['./precious-metal-breakdown.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PreciousMetalBreakdownComponent {
  @Input() title: string = '';
  @Input() breakdowns: PreciousMetalBreakdown[] = [];
  @Input() totals: MetalTotals = emptyMetalTotal;
  @Input() totalsTitle: string = 'Totals';
  @Input() totalsClass: string = '';
  /** The unit weights are shown in; bind with `[(unit)]` to share one choice across breakdowns. */
  @Input() unit: MetalUnitId = 'toz';
  @Output() unitChange = new EventEmitter<MetalUnitId>();

  readonly units = METAL_UNITS;

  get unitLabel(): string {
    return this.selectedUnit.label;
  }

  private get selectedUnit(): MetalUnit {
    return findMetalUnit(this.unit) ?? findMetalUnit('toz')!;
  }

  pickUnit(id: string) {
    this.unit = id as MetalUnitId;
    this.unitChange.emit(this.unit);
  }

  /** Small units get fewer places so a grain or milligram count doesn't trail zeros. */
  weight(grams: number): string {
    const unit = this.selectedUnit;
    const places = unit.grams >= 10 ? 3 : unit.grams >= 0.5 ? 2 : 1;
    return (grams / unit.grams).toFixed(places);
  }

  /** Spot value per unit of the whole piece, the way buyers quote scrap, e.g. $/dwt of 14K. */
  perUnit(value: number, grams: number): string {
    return grams > 0 ? (value / (grams / this.selectedUnit.grams)).toFixed(2) : '0.00';
  }
}
