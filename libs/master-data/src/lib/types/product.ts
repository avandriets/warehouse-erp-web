import type { CategoryReference } from './category';
import type { UnitReference } from './unit';

export interface ProductPolicy {
  batch_expiry_required: boolean;
}

export interface ProductCreate {
  code: string;
  name: string;
  category_id: string;
  storage_unit_id: string;
  package_set_id: string | null;
  default_vat_rate_id: string | null;
  description: string | null;
  brand: string | null;
  attributes: Record<string, unknown>;
  policy: ProductPolicy;
}

export interface Product extends ProductCreate {
  id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  category?: CategoryReference | null;
  storage_unit?: UnitReference | null;
}

export type ProductUpdate = Partial<Omit<ProductCreate, 'code' | 'storage_unit_id'>> & { active?: boolean };

export interface ProductsQuery {
  q?: string;
  active?: boolean;
  category_id?: string;
  limit: number;
  offset: number;
}

export interface ProductsPage {
  items: Product[];
  total: number;
}

export interface ProductBarcodeCreate {
  value: string;
  package_id: string | null;
}

export interface ProductBarcode extends ProductBarcodeCreate {
  id: string;
  product_id: string;
  active: boolean;
}

export interface ProductMeasurementCreate {
  unit_id: string;
  storage_quantity: string;
  measured_quantity: string;
  use: 'REFERENCE_ONLY' | 'DOCUMENT';
  is_report_unit: boolean;
}

export interface ProductMeasurement extends ProductMeasurementCreate {
  id: string;
  product_id: string;
  active: boolean;
  unit?: UnitReference | null;
}

export interface ProductPackage {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

export interface ProductBarcodeUpdate {
  value?: string;
  package_id?: string | null;
  active?: boolean;
}

export type ProductAttributeType = 'text' | 'number' | 'boolean' | 'json';

export interface ProductAttributeEntry {
  key: string;
  type: ProductAttributeType;
  value: string;
}
