import type { EntityDataPage } from '@warehouse/shared';

export type WarehouseTrackingMode = 'NONE' | 'BATCH';

export type WarehouseIssueStrategy = 'MANUAL' | 'FIFO' | 'FEFO';

export const WAREHOUSE_TRACKING_LABELS: Readonly<Record<WarehouseTrackingMode, string>> = {
  NONE: 'No batches',
  BATCH: 'Batch tracking',
};

export const WAREHOUSE_ISSUE_LABELS: Readonly<Record<WarehouseIssueStrategy, string>> = {
  MANUAL: 'Manual',
  FIFO: 'FIFO',
  FEFO: 'FEFO',
};

export interface WarehousePolicy {
  address_storage_enabled: boolean;
  tracking_mode: WarehouseTrackingMode;
  issue_strategy: WarehouseIssueStrategy;
}

export interface WarehouseCreate extends Partial<WarehousePolicy> {
  code: string;
  name: string;
  description: string | null;
}

export interface Warehouse extends WarehouseCreate {
  id: string;
  active: boolean;
  address_storage_enabled: boolean;
  tracking_mode: WarehouseTrackingMode;
  issue_strategy: WarehouseIssueStrategy;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  can_manage?: boolean;
}

export interface WarehouseUpdate extends Partial<WarehousePolicy> {
  name?: string;
  description?: string | null;
  active?: boolean;
}

export interface WarehousesQuery {
  q?: string;
  active?: boolean;
  limit: number;
  offset: number;
}

export interface WarehousesPageResponse {
  items: Warehouse[];
  total: number;
  can_create: boolean;
}

export interface WarehouseEntityPage extends EntityDataPage<Warehouse> {
  canCreate?: boolean;
}
