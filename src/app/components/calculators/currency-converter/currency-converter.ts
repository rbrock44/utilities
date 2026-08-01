import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExchangeRateService } from '../../../services/exchange-rate';
import { UnitConverterComponent } from '../unit-converter/unit-converter';

@Component({
  selector: 'app-currency-converter',
  standalone: true,
  imports: [CommonModule, UnitConverterComponent],
  templateUrl: './currency-converter.html',
  styleUrl: './currency-converter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyConverterComponent implements OnInit {
  units: UnitDefinition[] = [];
  loading = true;
  errorMessage: string | null = null;
  updatedAt: Date | null = null;

  constructor(
    private exchangeRateService: ExchangeRateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.exchangeRateService.getRates().subscribe(rates => {
      this.loading = false;
      if (Object.keys(rates.rates).length === 0) {
        this.errorMessage = 'Unable to load exchange rates right now. Please try again later.';
      } else {
        this.units = this.exchangeRateService.toUnitDefinitions(rates);
        this.updatedAt = rates.timestamp;
      }
      this.cdr.markForCheck();
    });
  }
}
