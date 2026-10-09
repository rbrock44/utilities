import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SpotPriceService } from '../../../services/spot-price';
import { PreciousMetalBreakdownComponent } from '../precious-metal-breakdown/precious-metal-breakdown';
import { emptyMetalTotal, goldTypes, silverTypes } from '../../../constants/constants';
import { MetalService } from '../../../services/metal';

@Component({
  selector: 'app-precious-metals',
  standalone: true,
  imports: [CommonModule, FormsModule, PreciousMetalBreakdownComponent],
  templateUrl: './precious-metals.html',
  styleUrl: './precious-metals.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PreciousMetalsComponent implements OnInit {
  spotPrices: SpotPrices = {
    gold: -1.00,
    silver: -1.00,
    timestamp: new Date()
  };
  loading = true;

  goldRows: MetalRow[] = [{ id: 1, type: goldTypes[0].name, weight: 0, unit: 'grams' }];
  silverRows: MetalRow[] = [{ id: 1, type: silverTypes[0].name, weight: 0, unit: 'grams' }];

  goldBreakdowns: PreciousMetalBreakdown[] = [];
  silverBreakdowns: PreciousMetalBreakdown[] = [];

  goldTotals: MetalTotals = emptyMetalTotal;
  silverTotals: MetalTotals = emptyMetalTotal;

  grandTotals = {
    spotValue: 0,
    value90: 0,
    value80: 0,
    value70: 0
  };

  offerOpen = false;
  offerAmount: number | null = null;
  offerPercent: number | null = null;
  private offerSource: 'amount' | 'percent' = 'amount';

  goldMetalTypes: MetalType[] = goldTypes;
  silverMetalTypes: MetalType[] = silverTypes;

  private nextGoldId = 2;
  private nextSilverId = 2;

  constructor(
    private cdr: ChangeDetectorRef,
    private spotPriceService: SpotPriceService,
    private metalService: MetalService
  ) { }

  ngOnInit() {
    this.loadSpotPrices();
  }

  loadSpotPrices() {
    this.loading = true;
    this.spotPriceService.getSpotPrices().subscribe({
      next: (prices) => {
        this.spotPrices = prices;
        this.loading = false;
        this.calculate();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading spot prices:', error);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  addGoldRow() {
    this.goldRows.push({
      id: this.nextGoldId++,
      type: goldTypes[0].name,
      weight: 0,
      unit: 'grams'
    });
    this.calculate();
  }

  addSilverRow() {
    this.silverRows.push({
      id: this.nextSilverId++,
      type: silverTypes[0].name,
      weight: 0,
      unit: 'grams'
    });
    this.calculate();
  }

  /** Removes the row, or resets it to defaults when it is the only one left. */
  removeGoldRow(id: number) {
    if (this.goldRows.length > 1) {
      this.goldRows = this.goldRows.filter(row => row.id !== id);
    } else {
      this.goldRows = [{ id: this.nextGoldId++, type: goldTypes[0].name, weight: 0, unit: 'grams' }];
    }
    this.calculate();
  }

  /** Removes the row, or resets it to defaults when it is the only one left. */
  removeSilverRow(id: number) {
    if (this.silverRows.length > 1) {
      this.silverRows = this.silverRows.filter(row => row.id !== id);
    } else {
      this.silverRows = [{ id: this.nextSilverId++, type: silverTypes[0].name, weight: 0, unit: 'grams' }];
    }
    this.calculate();
  }

  calculate() {
    if (!this.spotPrices) return;

    this.calculateGold();
    this.calculateSilver();
    this.calculateGrandTotals();
  }

  private calculateGold() {
    if (!this.spotPrices) return;

    const goldCalc = this.metalService.calculateGoldPrice(this.spotPrices, this.goldRows)

    this.goldBreakdowns = goldCalc.breakdowns;
    this.goldTotals = goldCalc.totals
  }

  private calculateSilver() {
    if (!this.spotPrices) return;

    const silverCalc = this.metalService.calculateSilverPrice(this.spotPrices, this.silverRows)

    this.silverBreakdowns = silverCalc.breakdowns;
    this.silverTotals = silverCalc.totals
  }

  private calculateGrandTotals() {
    this.grandTotals = {
      spotValue: this.goldTotals.spotValue + this.silverTotals.spotValue,
      value90: this.goldTotals.value90 + this.silverTotals.value90,
      value80: this.goldTotals.value80 + this.silverTotals.value80,
      value70: this.goldTotals.value70 + this.silverTotals.value70
    };
    this.syncOffer();
  }

  toggleOffer() {
    this.offerOpen = !this.offerOpen;
  }

  onOfferAmountChange(amount: number | null) {
    this.offerAmount = amount;
    this.offerSource = 'amount';
    this.syncOffer();
  }

  onOfferPercentChange(percent: number | null) {
    this.offerPercent = percent;
    this.offerSource = 'percent';
    this.syncOffer();
  }

  /** Recomputes whichever offer field the user did not type in last, against the combined spot value. */
  private syncOffer() {
    const spot = this.grandTotals.spotValue;
    if (spot <= 0) return;

    if (this.offerSource === 'amount') {
      this.offerPercent = this.offerAmount == null ? null : this.round2(this.offerAmount / spot * 100);
    } else {
      this.offerAmount = this.offerPercent == null ? null : this.round2(spot * this.offerPercent / 100);
    }
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}