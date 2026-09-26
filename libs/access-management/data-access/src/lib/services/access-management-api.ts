import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  PermissionRecord,
  RoleAssignmentCreate,
  RoleAssignmentRecord,
  RoleCreate,
  RoleRecord,
  RoleUpdate,
  UserRecord,
  UserStatus,
  UserWrite,
} from '@warehouse/access-management/util';
import { ACCESS_MANAGEMENT_CONFIG } from '@warehouse/access-management/util';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AccessManagementApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(ACCESS_MANAGEMENT_CONFIG).apiUrl;

  listUsers(limit = 25, offset = 0, status?: UserStatus): Promise<UserRecord[]> {
    const params: Record<string, string | number> = { limit, offset };
    if (status) params['status'] = status;

    return firstValueFrom(this.http.get<UserRecord[]>(`${this.base}/identity/users`, { params }));
  }

  createUser(payload: UserWrite): Promise<UserRecord> {
    return firstValueFrom(this.http.post<UserRecord>(`${this.base}/identity/users`, payload));
  }

  updateUser(userId: string, payload: UserWrite): Promise<UserRecord> {
    return firstValueFrom(this.http.patch<UserRecord>(`${this.base}/identity/users/${userId}`, payload));
  }

  linkAuth0(userId: string, auth0Subject: string): Promise<UserRecord> {
    return firstValueFrom(this.http.put<UserRecord>(`${this.base}/identity/users/${userId}/auth0`, { auth0_subject: auth0Subject }));
  }

  activateUser(userId: string): Promise<UserRecord> {
    return firstValueFrom(this.http.post<UserRecord>(`${this.base}/identity/users/${userId}/activate`, null));
  }

  suspendUser(userId: string): Promise<UserRecord> {
    return firstValueFrom(this.http.post<UserRecord>(`${this.base}/identity/users/${userId}/suspend`, null));
  }

  listRoles(active?: boolean): Promise<RoleRecord[]> {
    return firstValueFrom(this.http.get<RoleRecord[]>(`${this.base}/identity/roles`, { params: active === undefined ? {} : { active } }));
  }

  createRole(payload: RoleCreate): Promise<RoleRecord> {
    return firstValueFrom(this.http.post<RoleRecord>(`${this.base}/identity/roles`, payload));
  }

  updateRole(roleId: string, payload: RoleUpdate): Promise<RoleRecord> {
    return firstValueFrom(this.http.patch<RoleRecord>(`${this.base}/identity/roles/${roleId}`, payload));
  }

  listPermissions(): Promise<PermissionRecord[]> {
    return firstValueFrom(this.http.get<PermissionRecord[]>(`${this.base}/identity/permissions`));
  }

  listRolePermissions(roleId: string): Promise<PermissionRecord[]> {
    return firstValueFrom(this.http.get<PermissionRecord[]>(`${this.base}/identity/roles/${roleId}/permissions`));
  }

  replaceRolePermissions(roleId: string, permissionCodes: string[]): Promise<PermissionRecord[]> {
    return firstValueFrom(this.http.put<PermissionRecord[]>(`${this.base}/identity/roles/${roleId}/permissions`, { permission_codes: permissionCodes }));
  }

  listRoleAssignments(userId: string): Promise<RoleAssignmentRecord[]> {
    return firstValueFrom(this.http.get<RoleAssignmentRecord[]>(`${this.base}/identity/users/${userId}/role-assignments`));
  }

  assignRole(userId: string, payload: RoleAssignmentCreate): Promise<RoleAssignmentRecord> {
    return firstValueFrom(this.http.post<RoleAssignmentRecord>(`${this.base}/identity/users/${userId}/role-assignments`, payload));
  }

  revokeRoleAssignment(userId: string, assignmentId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/identity/users/${userId}/role-assignments/${assignmentId}`));
  }
}
