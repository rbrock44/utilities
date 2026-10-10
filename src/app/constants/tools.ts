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
  /** Set for tools reachable by URL but not shown on the home page or in the sitemap. */
  unlisted?: { title: string; description: string };
}

const unitConverter = () =>
  import('../components/calculators/unit-converter/unit-converter').then(m => m.UnitConverterComponent);

/** Keyed by the tile `param` in categories.ts, which is also the route path. */
export const TOOLS: Record<string, ToolDefinition> = {
  'precious-metals': {
    alias: 'pm',
    load: () => import('../components/calculators/precious-metals/precious-metals').then(m => m.PreciousMetalsComponent)
  },
  'silver-in-coins': {
    alias: 'sic',
    load: () => import('../components/information/silver-in-coin/silver-in-coin').then(m => m.SilverInCoinComponent)
  },
  'gold-in-coins': {
    alias: 'gic',
    load: () => import('../components/information/gold-in-coin/gold-in-coin').then(m => m.GoldInCoinComponent)
  },
  'right-angle-calculator': {
    alias: 'rac',
    load: () => import('../components/calculators/right-angle-calculator/right-angle-calculator').then(m => m.RightAngleCalculatorComponent)
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
    load: () => import('../components/calculators/divider-spacing-calculator/divider-spacing-calculator').then(m => m.DividerSpacingCalculatorComponent)
  },
  'image-to-pdf': {
    alias: 'itp',
    load: () => import('../components/utilities/image-to-pdf/image-to-pdf').then(m => m.ImageToPdfComponent)
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
    load: () => import('../components/utilities/email-link-generator/email-link-generator').then(m => m.EmailLinkGeneratorComponent)
  },
  'hex-generator': {
    alias: 'hg',
    load: () => import('../components/utilities/hex-generator/hex-generator').then(m => m.HexGeneratorComponent)
  },
  'guid-generator': {
    alias: 'gg',
    load: () => import('../components/utilities/guid-generator/guid-generator').then(m => m.GuidGeneratorComponent)
  },
  'length-converter': {
    alias: 'lc',
    load: unitConverter,
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
    load: () => import('../components/calculators/currency-converter/currency-converter').then(m => m.CurrencyConverterComponent)
  },
  'number-base-converter': {
    alias: 'nbc',
    load: () => import('../components/calculators/number-base-converter/number-base-converter').then(m => m.NumberBaseConverterComponent)
  },
  'base64-converter': {
    alias: 'b64',
    load: () => import('../components/utilities/base64-converter/base64-converter').then(m => m.Base64ConverterComponent)
  },
  'timestamp-converter': {
    alias: 'tsc',
    load: () => import('../components/utilities/timestamp-converter/timestamp-converter').then(m => m.TimestampConverterComponent)
  },
  'color-converter': {
    alias: 'clr',
    load: () => import('../components/utilities/color-converter/color-converter').then(m => m.ColorConverterComponent)
  },
  'loan-calculator': {
    alias: 'lnc',
    load: () => import('../components/calculators/loan-calculator/loan-calculator').then(m => m.LoanCalculatorComponent)
  },
  'image-resizer': {
    alias: 'imr',
    load: () => import('../components/utilities/image-resizer/image-resizer').then(m => m.ImageResizerComponent)
  },
  'json-formatter': {
    alias: 'jsn',
    load: () => import('../components/utilities/json-formatter/json-formatter').then(m => m.JsonFormatterComponent)
  },
  'url-encoder': {
    alias: 'url',
    load: () => import('../components/utilities/url-encoder/url-encoder').then(m => m.UrlEncoderComponent)
  },
  'text-case-converter': {
    alias: 'tcc',
    load: () => import('../components/utilities/text-case-converter/text-case-converter').then(m => m.TextCaseConverterComponent)
  },
  'text-diff': {
    alias: 'dif',
    load: () => import('../components/utilities/text-diff/text-diff').then(m => m.TextDiffComponent)
  },
  'board-foot-calculator': {
    alias: 'bfc',
    load: () => import('../components/calculators/board-foot-calculator/board-foot-calculator').then(m => m.BoardFootCalculatorComponent)
  },
  'qr-code-generator': {
    alias: 'qr',
    load: () => import('../components/utilities/qr-code-generator/qr-code-generator').then(m => m.QrCodeGeneratorComponent)
  },
  'jwt-decoder': {
    alias: 'jwt',
    load: () => import('../components/utilities/jwt-decoder/jwt-decoder').then(m => m.JwtDecoderComponent)
  },
  'favicon-generator': {
    alias: 'fav',
    load: () => import('../components/utilities/favicon-generator/favicon-generator').then(m => m.FaviconGeneratorComponent)
  },
  'pdf-to-images': {
    alias: 'pti',
    load: () => import('../components/utilities/pdf-to-images/pdf-to-images').then(m => m.PdfToImagesComponent)
  },
  'cut-list-optimizer': {
    alias: 'clo',
    load: () => import('../components/calculators/cut-list-optimizer/cut-list-optimizer').then(m => m.CutListOptimizerComponent)
  },
  'cron-translator': {
    alias: 'crn',
    load: () => import('../components/utilities/cron-translator/cron-translator').then(m => m.CronTranslatorComponent)
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
