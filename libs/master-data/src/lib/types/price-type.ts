export type PriceEntryMode = 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE';

export const PRICE_ENTRY_MODE_LABELS: Readonly<Record<PriceEntryMode, string>> = {
  TAX_INCLUSIVE: 'Tax inclusive',
  TAX_EXCLUSIVE: 'Tax exclusive',
};

export const PRICE_ENTRY_MODES = Object.keys(PRICE_ENTRY_MODE_LABELS) as PriceEntryMode[];

export interface PriceTypeCreate {
  code: string;
  name: string;
  price_entry_mode: PriceEntryMode;
  active: boolean;
}

export interface PriceType extends PriceTypeCreate {
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PriceTypesPage {
  items: PriceType[];
  total: number;
}

export interface PriceTypeUpdate {
  expected_version: number;
  name?: string;
  price_entry_mode?: PriceEntryMode;
  active?: boolean;
}

export interface PriceTypesQuery {
  q?: string;
  active?: boolean;
  limit: number;
  offset: number;
}
