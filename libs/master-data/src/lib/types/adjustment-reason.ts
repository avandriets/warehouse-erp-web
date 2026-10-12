export type AdjustmentOperation = 'WRITE_OFF' | 'ADJUSTMENT' | 'SPOILAGE' | 'DISPOSAL';

export const ADJUSTMENT_OPERATION_LABELS: Readonly<Record<AdjustmentOperation, string>> = {
  WRITE_OFF: 'Write-off',
  ADJUSTMENT: 'Adjustment',
  SPOILAGE: 'Spoilage',
  DISPOSAL: 'Disposal',
};

export const ADJUSTMENT_OPERATIONS = Object.keys(ADJUSTMENT_OPERATION_LABELS) as AdjustmentOperation[];

export interface AdjustmentReasonCreate {
  code: string;
  name: string;
  operation: AdjustmentOperation;
  active: boolean;
}

export interface AdjustmentReason extends AdjustmentReasonCreate {
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface AdjustmentReasonsPage {
  items: AdjustmentReason[];
  total: number;
}

export interface AdjustmentReasonUpdate {
  expected_version: number;
  name?: string;
  operation?: AdjustmentOperation;
  active?: boolean;
}

export interface AdjustmentReasonsQuery {
  q?: string;
  active?: boolean;
  limit: number;
  offset: number;
}
