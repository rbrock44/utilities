import { ChangeDetectionStrategy, ChangeDetectorRef, Component, signal } from '@angular/core';
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { TileGridComponent } from './components/tile-grid/tile-grid';
import { HeaderComponent } from './components/header/header';
import { BackButtonComponent } from './components/back-button/back-button';
import { SettingsService } from './services/settings';
import { PreciousMetalsComponent } from './components/calculators/precious-metals/precious-metals';
import { SilverInCoinComponent } from "./components/information/silver-in-coin/silver-in-coin";
import { GoldInCoinComponent } from "./components/information/gold-in-coin/gold-in-coin";
import { RightAngleCalculatorComponent } from './components/calculators/right-angle-calculator/right-angle-calculator';
import { CleaningPayoutCalculatorComponent } from './components/calculators/cleaning-payout-calculator/cleaning-payout-calculator';
import { DividerSpacingCalculatorComponent } from './components/calculators/divider-spacing-calculator/divider-spacing-calculator';
import { ImageToPdfComponent } from './components/utilities/image-to-pdf/image-to-pdf';
import { PdfCombinerComponent } from './components/utilities/pdf-combiner/pdf-combiner';
import { PdfPageUtilityComponent } from './components/utilities/pdf-page-utility/pdf-page-utility';
import { EmailLinkGeneratorComponent } from './components/utilities/email-link-generator/email-link-generator';
import { HexGeneratorComponent } from './components/utilities/hex-generator/hex-generator';
import { GuidGeneratorComponent } from './components/utilities/guid-generator/guid-generator';
import { UnitConverterComponent } from './components/calculators/unit-converter/unit-converter';
import { CurrencyConverterComponent } from './components/calculators/currency-converter/currency-converter';
import { NumberBaseConverterComponent } from './components/calculators/number-base-converter/number-base-converter';
import { Base64ConverterComponent } from './components/utilities/base64-converter/base64-converter';
import { TimestampConverterComponent } from './components/utilities/timestamp-converter/timestamp-converter';
import { ColorConverterComponent } from './components/utilities/color-converter/color-converter';
import { LoanCalculatorComponent } from './components/calculators/loan-calculator/loan-calculator';
import { ImageResizerComponent } from './components/utilities/image-resizer/image-resizer';
import { JsonFormatterComponent } from './components/utilities/json-formatter/json-formatter';
import { UrlEncoderComponent } from './components/utilities/url-encoder/url-encoder';
import { TextCaseConverterComponent } from './components/utilities/text-case-converter/text-case-converter';
import { TextDiffComponent } from './components/utilities/text-diff/text-diff';
import { BoardFootCalculatorComponent } from './components/calculators/board-foot-calculator/board-foot-calculator';
import { QrCodeGeneratorComponent } from './components/utilities/qr-code-generator/qr-code-generator';
import { JwtDecoderComponent } from './components/utilities/jwt-decoder/jwt-decoder';
import { LENGTH_UNITS } from './constants/units/length-units';
import { WEIGHT_UNITS } from './constants/units/weight-units';
import { VOLUME_UNITS } from './constants/units/volume-units';
import { TEMPERATURE_UNITS } from './constants/units/temperature-units';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent,
    BackButtonComponent,
    GoldInCoinComponent,
    PreciousMetalsComponent,
    RightAngleCalculatorComponent,
    CleaningPayoutCalculatorComponent,
    DividerSpacingCalculatorComponent,
    ImageToPdfComponent,
    PdfCombinerComponent,
    PdfPageUtilityComponent,
    EmailLinkGeneratorComponent,
    HexGeneratorComponent,
    GuidGeneratorComponent,
    UnitConverterComponent,
    CurrencyConverterComponent,
    NumberBaseConverterComponent,
    Base64ConverterComponent,
    TimestampConverterComponent,
    ColorConverterComponent,
    LoanCalculatorComponent,
    ImageResizerComponent,
    JsonFormatterComponent,
    UrlEncoderComponent,
    TextCaseConverterComponent,
    TextDiffComponent,
    BoardFootCalculatorComponent,
    QrCodeGeneratorComponent,
    JwtDecoderComponent,
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
  protected readonly lengthUnits = LENGTH_UNITS;
  protected readonly weightUnits = WEIGHT_UNITS;
  protected readonly volumeUnits = VOLUME_UNITS;
  protected readonly temperatureUnits = TEMPERATURE_UNITS;

  constructor(
    public settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
  ) { }

  /** True when the selected tile matches any of its aliases (short code or full name). */
  isTile(...aliases: string[]): boolean {
    const selected = this.settingsService.getSelectedTile();
    return selected !== null && aliases.includes(selected);
  }

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
