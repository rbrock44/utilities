import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SILVER_COIN_DATABASE } from '../../../constants/constants';
import { SpotPriceService } from '../../../services/spot-price';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-silver-in-coin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './silver-in-coin.html',
  styleUrl: './silver-in-coin.scss',
})
export class SilverInCoinComponent implements OnInit {
  coinDatabase: CoinSpec[] = SILVER_COIN_DATABASE;
  displayCoins: CoinDisplay[] = [];
  filteredCoins: CoinDisplay[] = [];
  
  spotPrices: SpotPrices | null = null;
  loading: boolean = false;
  
  searchTerm: string = '';
  filterPurity: string = 'all';
  
  sortColumn: string = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private cdr: ChangeDetectorRef,
    private spotPriceService: SpotPriceService
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
        this.calculateAllValues();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading spot prices:', error);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  calculateAllValues() {
    const GRAMS_PER_TOZ = 31.1035;
    
    this.displayCoins = this.coinDatabase.map(coin => {
      const pureSilverGrams = coin.weightGrams * coin.silverPurity;
      const pureSilverToz = pureSilverGrams / GRAMS_PER_TOZ;
      
      let spotValue = 0;
      let value90 = 0;
      let value80 = 0;
      
      if (this.spotPrices && coin.silverPurity > 0) {
        spotValue = pureSilverToz * this.spotPrices.silver;
        value90 = spotValue * 0.90;
        value80 = spotValue * 0.80;
      }
      
      return {
        ...coin,
        pureSilverGrams,
        pureSilverToz,
        spotValue,
        value90,
        value80,
      };
    });
    
    this.filterCoins();
  }

  filterCoins() {
    let filtered = this.displayCoins;
    
    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(coin => 
        coin.name.toLowerCase().includes(term) ||
        coin.description?.toLowerCase().includes(term)
      );
    }
    
    // Apply purity filter
    if (this.filterPurity !== 'all') {
      const purity = parseFloat(this.filterPurity);
      filtered = filtered.filter(coin => coin.silverPurity === purity);
    }
    
    this.filteredCoins = filtered;
    this.sortCoins();
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortCoins();
  }

  sortCoins() {
    this.filteredCoins.sort((a, b) => {
      let aVal: any = a[this.sortColumn as keyof CoinDisplay];
      let bVal: any = b[this.sortColumn as keyof CoinDisplay];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '⇅';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }
}