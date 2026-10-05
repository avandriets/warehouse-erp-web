import type { RoleRecord } from '@warehouse/access-management/util';

export interface RoleAssignmentDialogData {
  userId: string;
  roles: readonly RoleRecord[];
}
