import { ChangeDetectionStrategy, ChangeDetectorRef, Component, signal } from '@angular/core';
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { TileGridComponent } from './components/tile-grid/tile-grid';
import { HeaderComponent } from './components/header/header';
import { SettingsService } from './services/settings';
import { PreciousMetalsComponent } from './components/calculators/precious-metals/precious-metals';
import { SilverInCoinComponent } from "./components/information/silver-in-coin/silver-in-coin";
import { GoldInCoinComponent } from "./components/information/gold-in-coin/gold-in-coin";
import { RightAngleCalculatorComponent } from './components/calculators/right-angle-calculator/right-angle-calculator';
import { CleaningPayoutCalculatorComponent } from './components/calculators/cleaning-payout-calculator/cleaning-payout-calculator';
import { DividerSpacingCalculatorComponent } from './components/calculators/divider-spacing-calculator/divider-spacing-calculator';
import { ImageToPdfComponent } from './components/utilities/image-to-pdf/image-to-pdf';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent,
    GoldInCoinComponent,
    PreciousMetalsComponent,
    RightAngleCalculatorComponent,
    CleaningPayoutCalculatorComponent,
    DividerSpacingCalculatorComponent,
    ImageToPdfComponent,
    SilverInCoinComponent,
    TileGridComponent,
    RouterOutlet,
    CommonModule,
],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  protected readonly title = signal('utilities');

  constructor(
    public settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const tileParam = params[this.settingsService.tileUrlParam];
      if (tileParam !== null && tileParam !== undefined && tileParam !== "") {
        this.settingsService.setSelectedTile(tileParam);
        this.cdr.markForCheck();
      } 
    });
  }
}
