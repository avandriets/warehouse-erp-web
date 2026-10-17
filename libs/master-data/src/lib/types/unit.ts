export type UnitDimension = 'COUNT' | 'MASS' | 'VOLUME' | 'LENGTH' | 'AREA' | 'OTHER';

export const UNIT_DIMENSION_LABELS: Readonly<Record<UnitDimension, string>> = {
  COUNT: 'Count',
  MASS: 'Mass',
  VOLUME: 'Volume',
  LENGTH: 'Length',
  AREA: 'Area',
  OTHER: 'Other',
};

export const UNIT_DIMENSIONS = Object.keys(UNIT_DIMENSION_LABELS) as UnitDimension[];

export interface UnitCreate {
  code: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  classifier_code: string | null;
  display_decimal_places: number;
  precision: number;
  base_unit_id: string | null;
  factor_to_base: string | null;
}

export interface UnitReference {
  id: string;
  code: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  active: boolean;
  base_unit_id?: string | null;
}

export interface Unit extends UnitCreate {
  id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  base_unit?: UnitReference | null;
}

export interface UnitUpdate {
  name?: string;
  symbol?: string;
  dimension?: UnitDimension;
  classifier_code?: string | null;
  display_decimal_places?: number;
  precision?: number;
  active?: boolean;
}

export interface UnitsPage {
  items: Unit[];
  total: number;
}

export interface UnitsQuery {
  q?: string;
  active?: boolean;
  dimension?: UnitDimension;
  root_only?: boolean;
  limit: number;
  offset: number;
}

export function normalizeUnit<T extends Partial<UnitCreate>>(payload: T): T {
  return {
    ...payload,
    ...(payload.code === undefined ? {} : { code: payload.code.trim() }),
    ...(payload.name === undefined ? {} : { name: payload.name.trim() }),
    ...(payload.symbol === undefined ? {} : { symbol: payload.symbol.trim() }),
    ...(payload.classifier_code === undefined ? {} : { classifier_code: payload.classifier_code?.trim() || null }),
    ...(payload.factor_to_base === undefined ? {} : { factor_to_base: payload.factor_to_base?.trim() || null }),
  };
}

export function unitFactor(value: string): string {
  return value.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}
