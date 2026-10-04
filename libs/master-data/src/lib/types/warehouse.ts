export interface Warehouse {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly address: string;
}

export type WarehouseDraft = Omit<Warehouse, 'id'>;
