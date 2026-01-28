import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SpotPrices } from '../../../objects/spot-prices';
import { MetalRow } from '../../../objects/metal-row';
import { PreciousMetalBreakdown } from '../../../objects/precious-metal-breakdown';
import { SpotPriceService } from '../../../services/spot-price';

@Component({
  selector: 'app-precious-metals',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  goldTypes: MetalType[] = [
    { name: '24K Gold (99.9%)', purity: 0.999 },
    { name: '22K Gold (91.7%)', purity: 0.917 },
    { name: '18K Gold (75%)', purity: 0.75 },
    { name: '14K Gold (58.3%)', purity: 0.583 },
    { name: '10K Gold (41.7%)', purity: 0.417 }
  ];

  silverTypes: MetalType[] = [
    { name: 'Fine Silver (99.9%)', purity: 0.999 },
    { name: 'Sterling Silver (92.5%)', purity: 0.925 },
    { name: 'Coin Silver (90%)', purity: 0.90 },
    { name: 'Silver 80%', purity: 0.80 }
  ];

  goldRows: MetalRow[] = [{ id: 1, type: this.goldTypes[0].name, weight: 0, unit: 'grams' }];
  silverRows: MetalRow[] = [{ id: 1, type: this.silverTypes[0].name, weight: 0, unit: 'grams' }];

  goldBreakdowns: PreciousMetalBreakdown[] = [];
  silverBreakdowns: PreciousMetalBreakdown[] = [];

  goldTotals = {
    totalWeightGrams: 0,
    totalWeightToz: 0,
    totalPureGrams: 0,
    totalPureToz: 0,
    spotValue: 0,
    value90: 0,
    value80: 0
  };

  silverTotals = {
    totalWeightGrams: 0,
    totalWeightToz: 0,
    totalPureGrams: 0,
    totalPureToz: 0,
    spotValue: 0,
    value90: 0,
    value80: 0
  };

  grandTotals = {
    spotValue: 0,
    value90: 0,
    value80: 0
  };

  private nextGoldId = 2;
  private nextSilverId = 2;

  constructor(private spotPriceService: SpotPriceService) { }

  ngOnInit() {
    this.loadSpotPrices();
  }

  loadSpotPrices() {
    this.loading = true;
    this.spotPriceService.getSpotPrices().subscribe({
      next: (prices) => {
        this.spotPrices = prices;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading spot prices:', error);
        this.loading = false;
      }
    });
  }

  addGoldRow() {
    this.goldRows.push({
      id: this.nextGoldId++,
      type: this.goldTypes[0].name,
      weight: 0,
      unit: 'grams'
    });
  }

  addSilverRow() {
    this.silverRows.push({
      id: this.nextSilverId++,
      type: this.silverTypes[0].name,
      weight: 0,
      unit: 'grams'
    });
  }

  removeGoldRow(id: number) {
    if (this.goldRows.length > 1) {
      this.goldRows = this.goldRows.filter(row => row.id !== id);
    }
  }

  removeSilverRow(id: number) {
    if (this.silverRows.length > 1) {
      this.silverRows = this.silverRows.filter(row => row.id !== id);
    }
  }

  calculate() {
    if (!this.spotPrices) return;

    this.calculateGold();
    this.calculateSilver();
    this.calculateGrandTotals();
  }

  private calculateGold() {
    if (!this.spotPrices) return;

    const breakdowns: PreciousMetalBreakdown[] = [];
    let totalWeightGrams = 0;
    let totalPureGrams = 0;

    this.goldRows.forEach(row => {
      if (row.weight <= 0) return;

      const metalType = this.goldTypes.find(t => t.name === row.type);
      if (!metalType) return;

      const weightGrams = row.unit === 'grams' ? row.weight : row.weight * 31.1035;
      const weightToz = weightGrams / 31.1035;
      const pureWeightGrams = weightGrams * metalType.purity;
      const pureWeightToz = pureWeightGrams / 31.1035;

      const spotValue = pureWeightToz * this.spotPrices.gold;
      const value90 = spotValue * 0.9;
      const value80 = spotValue * 0.8;

      breakdowns.push({
        type: row.type,
        weightGrams,
        weightToz,
        pureWeightGrams,
        pureWeightToz,
        spotValue,
        value90,
        value80
      });

      totalWeightGrams += weightGrams;
      totalPureGrams += pureWeightGrams;
    });

    this.goldBreakdowns = breakdowns;

    const totalWeightToz = totalWeightGrams / 31.1035;
    const totalPureToz = totalPureGrams / 31.1035;

    this.goldTotals = {
      totalWeightGrams,
      totalWeightToz,
      totalPureGrams,
      totalPureToz,
      spotValue: totalPureToz * this.spotPrices.gold,
      value90: totalPureToz * this.spotPrices.gold * 0.9,
      value80: totalPureToz * this.spotPrices.gold * 0.8
    };
  }

  private calculateSilver() {
    if (!this.spotPrices) return;

    const breakdowns: PreciousMetalBreakdown[] = [];
    let totalWeightGrams = 0;
    let totalPureGrams = 0;

    this.silverRows.forEach(row => {
      if (row.weight <= 0) return;

      const metalType = this.silverTypes.find(t => t.name === row.type);
      if (!metalType) return;

      const weightGrams = row.unit === 'grams' ? row.weight : row.weight * 31.1035;
      const weightToz = weightGrams / 31.1035;
      const pureWeightGrams = weightGrams * metalType.purity;
      const pureWeightToz = pureWeightGrams / 31.1035;

      const spotValue = pureWeightToz * this.spotPrices.silver;
      const value90 = spotValue * 0.9;
      const value80 = spotValue * 0.8;

      breakdowns.push({
        type: row.type,
        weightGrams,
        weightToz,
        pureWeightGrams,
        pureWeightToz,
        spotValue,
        value90,
        value80
      });

      totalWeightGrams += weightGrams;
      totalPureGrams += pureWeightGrams;
    });

    this.silverBreakdowns = breakdowns;

    const totalWeightToz = totalWeightGrams / 31.1035;
    const totalPureToz = totalPureGrams / 31.1035;

    this.silverTotals = {
      totalWeightGrams,
      totalWeightToz,
      totalPureGrams,
      totalPureToz,
      spotValue: totalPureToz * this.spotPrices.silver,
      value90: totalPureToz * this.spotPrices.silver * 0.9,
      value80: totalPureToz * this.spotPrices.silver * 0.8
    };
  }

  private calculateGrandTotals() {
    this.grandTotals = {
      spotValue: this.goldTotals.spotValue + this.silverTotals.spotValue,
      value90: this.goldTotals.value90 + this.silverTotals.value90,
      value80: this.goldTotals.value80 + this.silverTotals.value80
    };
  }
}