import type { PermissionRecord } from './permission';
import type { RoleRecord } from './role';
import type { RoleAssignmentRecord } from './role-assignment';
import type { UserStatus, UserWrite } from './user';

export interface UsersQuery {
  limit: number;
  offset: number;
  status?: UserStatus;
}

export type UserUpdateCommand = UserWrite | { status: 'ACTIVE' | 'SUSPENDED' };

export interface UserAccessData {
  roles: RoleRecord[];
  assignments: RoleAssignmentRecord[];
}

export interface RolePermissionsData {
  permissions: PermissionRecord[];
  assigned: PermissionRecord[];
}
