export interface EnterpriseFields {
  legal_name: string;
  display_name: string;
  tax_identifier: string | null;
  tax_identifier_label: string;
  registration_identifier: string | null;
  registration_identifier_label: string;
  legal_address: string | null;
  postal_address: string | null;
  contact_details: string | null;
  payment_details: string | null;
  logo_url: string | null;
}

export type EnterpriseEditableFields = Omit<EnterpriseFields, 'tax_identifier_label' | 'registration_identifier_label'>;

export interface VersionedRecord {
  id: string;
  version: number;
}

export interface EnterpriseSettings extends EnterpriseFields, VersionedRecord {}

export interface AccountingFields {
  currency_id: string | null;
  cost_accounting_enabled: boolean;
  cost_valuation_method: 'MOVING_WEIGHTED_AVERAGE' | 'FIFO';
  changes_locked_through: string | null;
  accounting_timezone: string;
  vat_enabled: boolean;
  price_entry_mode: 'TAX_EXCLUSIVE' | 'TAX_INCLUSIVE';
}

export interface AccountingSettings extends AccountingFields, VersionedRecord {
  default_vat_rate_id: string | null;
}

export interface NumberingFields {
  prefix: string;
  numeric_width: number;
  reset_annually: boolean;
}

export interface DocumentNumbering extends NumberingFields, VersionedRecord {
  document_type: string;
}

export interface NegativeStockValue extends VersionedRecord {
  scope_type: 'GLOBAL' | 'COMPANY' | 'WAREHOUSE' | 'CATEGORY' | 'PRODUCT';
  scope_id: string | null;
  value: boolean;
}

export type SettingsPatch<T> = Partial<T> & { expected_version: number };

export interface SettingsSnapshot {
  enterprise: EnterpriseSettings;
  accounting: AccountingSettings;
  numbering: DocumentNumbering[];
  negative: NegativeStockValue[];
}

export type SettingsUpdate =
  | { section: 'enterprise'; values: EnterpriseEditableFields }
  | { section: 'accounting'; values: AccountingFields }
  | { section: 'negative'; value: boolean }
  | { section: 'numbering'; documentType: string; values: NumberingFields };

export interface SettingsSaveRequest {
  snapshot: SettingsSnapshot;
  update: SettingsUpdate;
}
