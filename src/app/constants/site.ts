import { ToolDefinition } from './tools';

export const SITE_URL = 'https://utilities.ryan-brock.com';
export const SITE_TITLE = 'Utilities – Everyday Calculators & Conversion Tools';
export const SITE_DESCRIPTION =
  'A free collection of everyday calculators and tools: unit conversion, precious metal and coin values, currency exchange rates, cleaning payouts, and more.';

/** Route `data` read by the SEO title strategy and the tool page. */
export interface PageData {
  description: string;
  noindex?: boolean;
  tool?: ToolDefinition;
}
