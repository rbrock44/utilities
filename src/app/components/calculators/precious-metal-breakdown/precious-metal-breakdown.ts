import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { emptyMetalTotal } from '../../../constants/constants';

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
}
