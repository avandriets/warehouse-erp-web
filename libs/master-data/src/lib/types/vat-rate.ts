export type TaxTreatment = 'TAXABLE' | 'ZERO_RATE' | 'NO_VAT';

export const TAX_TREATMENT_LABELS: Readonly<Record<TaxTreatment, string>> = {
  TAXABLE: 'Taxable',
  ZERO_RATE: 'Zero-rated',
  NO_VAT: 'No VAT',
};

export const TAX_TREATMENTS = Object.keys(TAX_TREATMENT_LABELS) as TaxTreatment[];

export interface VatRateCreate {
  code: string;
  name: string;
  treatment: TaxTreatment;
  rate: string;
  active: boolean;
}

export interface VatRate extends VatRateCreate {
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface VatRatesPage {
  items: VatRate[];
  total: number;
}

export interface VatRateUpdate {
  name?: string;
  treatment?: TaxTreatment;
  rate?: string;
  active?: boolean;
}

export interface VatRatesQuery {
  q?: string;
  active?: boolean;
  limit: number;
  offset: number;
}
