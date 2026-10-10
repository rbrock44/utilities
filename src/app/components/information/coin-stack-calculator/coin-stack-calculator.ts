import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComboBoxComponent } from '../../combo-box/combo-box';
import { GOLD_COIN_DATABASE, SILVER_COIN_DATABASE } from '../../../constants/coins';
import { TROY_OZ_IN_GRAMS } from '../../../constants/constants';
import { SpotPriceService } from '../../../services/spot-price';

export type Metal = 'gold' | 'silver';

export interface CoinOption {
  id: string;
  label: string;
  metal: Metal;
  spec: CoinSpec;
}

export interface StackRow {
  coin: CoinOption;
  quantity: number | null;
}

/** Names repeat across years (two Kennedy halves), so ids come from metal and position. */
export const COIN_OPTIONS: CoinOption[] = [
  ...GOLD_COIN_DATABASE.map((spec, i) => toOption(spec, 'gold', i)),
  ...SILVER_COIN_DATABASE.map((spec, i) => toOption(spec, 'silver', i)),
];

function toOption(spec: CoinSpec, metal: Metal, index: number): CoinOption {
  const label = spec.description ? `${spec.name} · ${spec.description}` : spec.name;
  return { id: `${metal}-${index}`, label, metal, spec };
}

export function pureTozPerCoin(spec: CoinSpec): number {
  return (spec.weightGrams * spec.purity) / TROY_OZ_IN_GRAMS;
}

@Component({
  selector: 'app-coin-stack-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, ComboBoxComponent],
  templateUrl: './coin-stack-calculator.html',
  styleUrl: './coin-stack-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinStackCalculatorComponent implements OnInit {
  rows: StackRow[] = [];
  spotGold: number | null = null;
  spotSilver: number | null = null;
  dealerPercent: number | null = 90;
  loadingPrices = false;
  pricesFailed = false;
  pickerValue: string | null = null;

  readonly comboOptions: ComboBoxOption[] = COIN_OPTIONS.map(coin => ({
    id: coin.id,
    label: `${coin.metal === 'gold' ? 'Gold' : 'Silver'} · ${coin.label}`,
    searchText: `${coin.metal} ${coin.label}`.toLowerCase(),
  }));

  private readonly currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

  constructor(private spotPriceService: SpotPriceService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadingPrices = true;
    this.spotPriceService.getSpotPrices().subscribe(prices => {
      this.loadingPrices = false;
      // The service reports a failed fetch as -1 rather than erroring.
      if (prices.gold > 0 && prices.silver > 0) {
        this.spotGold = prices.gold;
        this.spotSilver = prices.silver;
      } else {
        this.pricesFailed = true;
      }
      this.cdr.markForCheck();
    });
  }

  /** Picking a coin already in the stack adds one more instead of a duplicate row. */
  addCoin(id: string): void {
    const coin = COIN_OPTIONS.find(option => option.id === id);
    if (!coin) {
      return;
    }

    const existing = this.rows.find(row => row.coin.id === id);
    if (existing) {
      existing.quantity = (existing.quantity ?? 0) + 1;
      this.rows = [...this.rows];
    } else {
      this.rows = [...this.rows, { coin, quantity: 1 }];
    }
    // The combo box keeps showing the picked label until its [value] input changes, so step
    // it to the id and back to null across two change-detection passes to empty the search.
    this.pickerValue = id;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.pickerValue = null;
      this.cdr.markForCheck();
    });
  }

  removeRow(row: StackRow): void {
    this.rows = this.rows.filter(r => r !== row);
  }

  clear(): void {
    this.rows = [];
  }

  rowToz(row: StackRow): number {
    return pureTozPerCoin(row.coin.spec) * this.quantity(row);
  }

  rowValue(row: StackRow): number | null {
    const spot = row.coin.metal === 'gold' ? this.spotGold : this.spotSilver;
    return this.isPositive(spot) ? this.rowToz(row) * spot! : null;
  }

  get goldToz(): number {
    return this.totalToz('gold');
  }

  get silverToz(): number {
    return this.totalToz('silver');
  }

  get coinCount(): number {
    return this.rows.reduce((sum, row) => sum + this.quantity(row), 0);
  }

  get errorMessage(): string | null {
    if (this.rows.some(row => !this.isWholeOrZero(row.quantity))) {
      return 'Quantities must be whole numbers, 0 or more.';
    }
    if (this.needsSpot('gold') && !this.isPositive(this.spotGold)) {
      return 'Enter a gold spot price to value the gold coins.';
    }
    if (this.needsSpot('silver') && !this.isPositive(this.spotSilver)) {
      return 'Enter a silver spot price to value the silver coins.';
    }
    if (this.dealerPercent === null || !Number.isFinite(this.dealerPercent) || this.dealerPercent < 0 || this.dealerPercent > 100) {
      return 'Dealer offer must be between 0% and 100%.';
    }
    return null;
  }

  get meltValue(): number | null {
    if (this.errorMessage !== null || this.rows.length === 0) {
      return null;
    }
    return this.rows.reduce((sum, row) => sum + (this.rowValue(row) ?? 0), 0);
  }

  get dealerValue(): number | null {
    const melt = this.meltValue;
    return melt === null ? null : (melt * this.dealerPercent!) / 100;
  }

  money(value: number | null): string {
    return value === null ? '—' : this.currency.format(value);
  }

  toz(value: number): string {
    return `${value.toFixed(4)} oz t`;
  }

  private totalToz(metal: Metal): number {
    return this.rows
      .filter(row => row.coin.metal === metal)
      .reduce((sum, row) => sum + this.rowToz(row), 0);
  }

  private needsSpot(metal: Metal): boolean {
    return this.rows.some(row => row.coin.metal === metal && this.quantity(row) > 0);
  }

  private quantity(row: StackRow): number {
    return this.isWholeOrZero(row.quantity) ? row.quantity! : 0;
  }

  private isPositive(value: number | null): boolean {
    return value !== null && Number.isFinite(value) && value > 0;
  }

  private isWholeOrZero(value: number | null): boolean {
    return value !== null && Number.isInteger(value) && value >= 0;
  }
}
