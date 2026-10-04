export interface Product {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
}

export type ProductDraft = Omit<Product, 'id'>;
