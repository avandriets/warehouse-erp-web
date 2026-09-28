import type { PermissionRecord, RoleAssignmentRecord } from '@warehouse/access-management/util';

export interface AccessResource<T> {
  contextId: string | null;
  data: T[];
}

export interface AccessState {
  permissions: AccessResource<PermissionRecord>;
  rolePermissions: AccessResource<PermissionRecord>;
  roleAssignments: AccessResource<RoleAssignmentRecord>;
}

export type AccessResourceKey = keyof AccessState;
