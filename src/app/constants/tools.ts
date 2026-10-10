import { Type } from '@angular/core';
import { LENGTH_UNITS } from './units/length-units';
import { WEIGHT_UNITS } from './units/weight-units';
import { VOLUME_UNITS } from './units/volume-units';
import { TEMPERATURE_UNITS } from './units/temperature-units';

export interface ToolDefinition {
  /** Short key from the old `?tile=` URLs, kept so those links still redirect. New tools have none. */
  alias?: string;
  load: () => Promise<Type<unknown>>;
  inputs?: Record<string, unknown>;
  /**
   * Hand-picked related tools, best first. The related panel tops these up from the same
   * category, so list the links a category can't supply on its own.
   */
  related?: string[];
  /** Set for tools reachable by URL but not shown on the home page or in the sitemap. */
  unlisted?: { title: string; description: string };
}

const unitConverter = () =>
  import('../components/calculators/unit-converter/unit-converter').then(m => m.UnitConverterComponent);

/** Keyed by the tile `param` in categories.ts, which is also the route path. */
export const TOOLS: Record<string, ToolDefinition> = {
  'precious-metals': {
    alias: 'pm',
    load: () => import('../components/calculators/precious-metals/precious-metals').then(m => m.PreciousMetalsComponent),
    related: ['gold-in-coins', 'silver-in-coins', 'weight-converter']
  },
  'silver-in-coins': {
    alias: 'sic',
    load: () => import('../components/information/silver-in-coin/silver-in-coin').then(m => m.SilverInCoinComponent),
    related: ['gold-in-coins', 'precious-metals', 'weight-converter']
  },
  'gold-in-coins': {
    alias: 'gic',
    load: () => import('../components/information/gold-in-coin/gold-in-coin').then(m => m.GoldInCoinComponent),
    related: ['silver-in-coins', 'precious-metals', 'weight-converter']
  },
  'right-angle-calculator': {
    alias: 'rac',
    load: () => import('../components/calculators/right-angle-calculator/right-angle-calculator').then(m => m.RightAngleCalculatorComponent),
    related: ['stair-stringer-calculator', 'length-converter']
  },
  'cleaning-payout-calculator': {
    alias: 'cpc',
    load: () => import('../components/calculators/cleaning-payout-calculator/cleaning-payout-calculator').then(m => m.CleaningPayoutCalculatorComponent),
    unlisted: {
      title: 'Cleaning Payout Calculator',
      description: 'Split a cleaning payout between workers'
    }
  },
  'divider-spacing-calculator': {
    alias: 'dsc',
    load: () => import('../components/calculators/divider-spacing-calculator/divider-spacing-calculator').then(m => m.DividerSpacingCalculatorComponent),
    related: ['cut-list-optimizer', 'length-converter']
  },
  'image-to-pdf': {
    alias: 'itp',
    load: () => import('../components/utilities/image-to-pdf/image-to-pdf').then(m => m.ImageToPdfComponent),
    related: ['image-resizer', 'pdf-combiner']
  },
  'pdf-combiner': {
    alias: 'pmc',
    load: () => import('../components/utilities/pdf-combiner/pdf-combiner').then(m => m.PdfCombinerComponent)
  },
  'pdf-page-utility': {
    alias: 'ppu',
    load: () => import('../components/utilities/pdf-page-utility/pdf-page-utility').then(m => m.PdfPageUtilityComponent)
  },
  'email-link-generator': {
    alias: 'elg',
    load: () => import('../components/utilities/email-link-generator/email-link-generator').then(m => m.EmailLinkGeneratorComponent),
    related: ['url-encoder', 'qr-code-generator', 'text-case-converter']
  },
  'hex-generator': {
    alias: 'hg',
    load: () => import('../components/utilities/hex-generator/hex-generator').then(m => m.HexGeneratorComponent),
    related: ['guid-generator', 'number-base-converter', 'color-converter']
  },
  'guid-generator': {
    alias: 'gg',
    load: () => import('../components/utilities/guid-generator/guid-generator').then(m => m.GuidGeneratorComponent),
    related: ['hex-generator', 'json-formatter', 'base64-converter']
  },
  'length-converter': {
    alias: 'lc',
    load: unitConverter,
    related: ['board-foot-calculator'],
    inputs: { title: 'Length Converter', units: LENGTH_UNITS }
  },
  'weight-converter': {
    alias: 'wc',
    load: unitConverter,
    inputs: { title: 'Weight Converter', units: WEIGHT_UNITS }
  },
  'volume-converter': {
    alias: 'vc',
    load: unitConverter,
    inputs: {
      title: 'Volume Converter',
      description: 'Includes cooking measurements like teaspoons, tablespoons, and cups.',
      units: VOLUME_UNITS
    }
  },
  'temperature-converter': {
    alias: 'tc',
    load: unitConverter,
    inputs: { title: 'Temperature Converter', units: TEMPERATURE_UNITS }
  },
  'currency-converter': {
    alias: 'cc',
    load: () => import('../components/calculators/currency-converter/currency-converter').then(m => m.CurrencyConverterComponent),
    related: ['precious-metals', 'loan-calculator']
  },
  'number-base-converter': {
    alias: 'nbc',
    load: () => import('../components/calculators/number-base-converter/number-base-converter').then(m => m.NumberBaseConverterComponent),
    related: ['hex-generator', 'color-converter']
  },
  'base64-converter': {
    alias: 'b64',
    load: () => import('../components/utilities/base64-converter/base64-converter').then(m => m.Base64ConverterComponent),
    related: ['jwt-decoder', 'url-encoder']
  },
  'timestamp-converter': {
    alias: 'tsc',
    load: () => import('../components/utilities/timestamp-converter/timestamp-converter').then(m => m.TimestampConverterComponent),
    related: ['cron-translator', 'jwt-decoder']
  },
  'color-converter': {
    alias: 'clr',
    load: () => import('../components/utilities/color-converter/color-converter').then(m => m.ColorConverterComponent),
    related: ['hex-generator', 'favicon-generator']
  },
  'loan-calculator': {
    alias: 'lnc',
    load: () => import('../components/calculators/loan-calculator/loan-calculator').then(m => m.LoanCalculatorComponent),
    related: ['compound-interest-calculator', 'currency-converter']
  },
  'image-resizer': {
    alias: 'imr',
    load: () => import('../components/utilities/image-resizer/image-resizer').then(m => m.ImageResizerComponent),
    related: ['favicon-generator', 'image-to-pdf', 'pdf-to-images']
  },
  'json-formatter': {
    alias: 'jsn',
    load: () => import('../components/utilities/json-formatter/json-formatter').then(m => m.JsonFormatterComponent),
    related: ['jwt-decoder', 'text-diff']
  },
  'url-encoder': {
    alias: 'url',
    load: () => import('../components/utilities/url-encoder/url-encoder').then(m => m.UrlEncoderComponent),
    related: ['base64-converter', 'qr-code-generator']
  },
  'text-case-converter': {
    alias: 'tcc',
    load: () => import('../components/utilities/text-case-converter/text-case-converter').then(m => m.TextCaseConverterComponent),
    related: ['text-diff', 'url-encoder']
  },
  'text-diff': {
    alias: 'dif',
    load: () => import('../components/utilities/text-diff/text-diff').then(m => m.TextDiffComponent),
    related: ['json-formatter', 'text-case-converter']
  },
  'board-foot-calculator': {
    alias: 'bfc',
    load: () => import('../components/calculators/board-foot-calculator/board-foot-calculator').then(m => m.BoardFootCalculatorComponent),
    related: ['cut-list-optimizer', 'stair-stringer-calculator', 'length-converter']
  },
  'qr-code-generator': {
    alias: 'qr',
    load: () => import('../components/utilities/qr-code-generator/qr-code-generator').then(m => m.QrCodeGeneratorComponent),
    related: ['url-encoder', 'email-link-generator']
  },
  'jwt-decoder': {
    alias: 'jwt',
    load: () => import('../components/utilities/jwt-decoder/jwt-decoder').then(m => m.JwtDecoderComponent),
    related: ['base64-converter', 'json-formatter', 'timestamp-converter']
  },
  'favicon-generator': {
    alias: 'fav',
    load: () => import('../components/utilities/favicon-generator/favicon-generator').then(m => m.FaviconGeneratorComponent),
    related: ['image-resizer', 'color-converter', 'qr-code-generator']
  },
  'pdf-to-images': {
    alias: 'pti',
    load: () => import('../components/utilities/pdf-to-images/pdf-to-images').then(m => m.PdfToImagesComponent),
    related: ['image-resizer']
  },
  'cut-list-optimizer': {
    alias: 'clo',
    load: () => import('../components/calculators/cut-list-optimizer/cut-list-optimizer').then(m => m.CutListOptimizerComponent),
    related: ['board-foot-calculator', 'divider-spacing-calculator', 'length-converter']
  },
  'inch-fraction-converter': {
    load: () => import('../components/calculators/inch-fraction-converter/inch-fraction-converter').then(m => m.InchFractionConverterComponent),
    related: ['length-converter', 'stair-stringer-calculator', 'board-foot-calculator', 'cut-list-optimizer']
  },
  'paint-drywall-calculator': {
    load: () => import('../components/calculators/paint-drywall-calculator/paint-drywall-calculator').then(m => m.PaintDrywallCalculatorComponent),
    related: ['inch-fraction-converter', 'board-foot-calculator', 'stair-stringer-calculator']
  },
  'coin-stack-calculator': {
    load: () => import('../components/information/coin-stack-calculator/coin-stack-calculator').then(m => m.CoinStackCalculatorComponent),
    related: ['gold-in-coins', 'silver-in-coins', 'precious-metals']
  },
  'compound-interest-calculator': {
    load: () => import('../components/calculators/compound-interest-calculator/compound-interest-calculator').then(m => m.CompoundInterestCalculatorComponent),
    related: ['loan-calculator', 'currency-converter']
  },
  'stair-stringer-calculator': {
    load: () => import('../components/calculators/stair-stringer-calculator/stair-stringer-calculator').then(m => m.StairStringerCalculatorComponent),
    related: ['right-angle-calculator', 'board-foot-calculator', 'length-converter']
  },
  'cron-translator': {
    alias: 'crn',
    load: () => import('../components/utilities/cron-translator/cron-translator').then(m => m.CronTranslatorComponent),
    related: ['timestamp-converter']
  }
};

/** Maps a legacy `?tile=` value (short alias or full param) to its route path. */
export function resolveLegacyTile(tile: string | null): string | null {
  if (!tile) {
    return null;
  }

  if (tile in TOOLS) {
    return tile;
  }

  return Object.keys(TOOLS).find(param => TOOLS[param].alias === tile) ?? null;
}
