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
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AccessManagementApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(ACCESS_MANAGEMENT_CONFIG).apiUrl;

  listUsers(limit = 25, offset = 0, status?: UserStatus): Observable<UserRecord[]> {
    const params: Record<string, string | number> = { limit, offset };
    if (status) params['status'] = status;

    return this.http.get<UserRecord[]>(`${this.base}/identity/users`, { params });
  }

  createUser(payload: UserWrite): Observable<UserRecord> {
    return this.http.post<UserRecord>(`${this.base}/identity/users`, payload);
  }

  updateUser(userId: string, payload: UserWrite): Observable<UserRecord> {
    return this.http.patch<UserRecord>(`${this.base}/identity/users/${userId}`, payload);
  }

  linkAuth0(userId: string, auth0Subject: string): Observable<UserRecord> {
    return this.http.put<UserRecord>(`${this.base}/identity/users/${userId}/auth0`, { auth0_subject: auth0Subject });
  }

  activateUser(userId: string): Observable<UserRecord> {
    return this.http.post<UserRecord>(`${this.base}/identity/users/${userId}/activate`, null);
  }

  suspendUser(userId: string): Observable<UserRecord> {
    return this.http.post<UserRecord>(`${this.base}/identity/users/${userId}/suspend`, null);
  }

  listRoles(active?: boolean): Observable<RoleRecord[]> {
    return this.http.get<RoleRecord[]>(`${this.base}/identity/roles`, {
      params: active === undefined ? {} : { active },
    });
  }

  createRole(payload: RoleCreate): Observable<RoleRecord> {
    return this.http.post<RoleRecord>(`${this.base}/identity/roles`, payload);
  }

  updateRole(roleId: string, payload: RoleUpdate): Observable<RoleRecord> {
    return this.http.patch<RoleRecord>(`${this.base}/identity/roles/${roleId}`, payload);
  }

  listPermissions(): Observable<PermissionRecord[]> {
    return this.http.get<PermissionRecord[]>(`${this.base}/identity/permissions`);
  }

  listRolePermissions(roleId: string): Observable<PermissionRecord[]> {
    return this.http.get<PermissionRecord[]>(`${this.base}/identity/roles/${roleId}/permissions`);
  }

  replaceRolePermissions(roleId: string, permissionCodes: string[]): Observable<PermissionRecord[]> {
    return this.http.put<PermissionRecord[]>(`${this.base}/identity/roles/${roleId}/permissions`, {
      permission_codes: permissionCodes,
    });
  }

  listRoleAssignments(userId: string): Observable<RoleAssignmentRecord[]> {
    return this.http.get<RoleAssignmentRecord[]>(`${this.base}/identity/users/${userId}/role-assignments`);
  }

  assignRole(userId: string, payload: RoleAssignmentCreate): Observable<RoleAssignmentRecord> {
    return this.http.post<RoleAssignmentRecord>(`${this.base}/identity/users/${userId}/role-assignments`, payload);
  }

  revokeRoleAssignment(userId: string, assignmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/identity/users/${userId}/role-assignments/${assignmentId}`);
  }
}
