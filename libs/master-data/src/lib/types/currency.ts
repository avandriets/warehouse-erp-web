export type CurrencyRoundingMode = 'HALF_UP' | 'HALF_EVEN' | 'DOWN';

export const CURRENCY_ROUNDING_LABELS: Readonly<Record<CurrencyRoundingMode, string>> = {
  HALF_UP: 'Half up',
  HALF_EVEN: 'Half even',
  DOWN: 'Down',
};

export const CURRENCY_ROUNDING_MODES = Object.keys(CURRENCY_ROUNDING_LABELS) as CurrencyRoundingMode[];

export interface CurrencyCreate {
  code: string;
  name: string;
  symbol: string;
  display_decimal_places: number;
  rounding_decimal_places: number;
  rounding_mode: CurrencyRoundingMode;
  active: boolean;
}

export interface Currency extends CurrencyCreate {
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CurrenciesPage {
  items: Currency[];
  total: number;
}

export interface CurrencyUpdate {
  expected_version: number;
  name?: string;
  symbol?: string;
  display_decimal_places?: number;
  rounding_decimal_places?: number;
  rounding_mode?: CurrencyRoundingMode;
  active?: boolean;
}

export interface CurrenciesQuery {
  q?: string;
  active?: boolean;
  limit: number;
  offset: number;
}

export interface CurrencyRate {
  base_code: string;
  quote_code: string;
  date: string;
  rate: string;
}

export interface CurrencyRateBatch {
  id: string;
  base_currency_id: string;
  base_code: string;
  source: string;
  fetched_at: string;
  fetched_by: string;
  rates: CurrencyRate[];
  missing_codes: string[];
}

export interface CurrencyRatesOverview {
  base_currency: Currency | null;
  settings_version: number;
  batch: CurrencyRateBatch | null;
}

export interface CurrencyRatesUpdate {
  type: 'rates';
  base_currency_id: string;
  expected_version: number;
}
