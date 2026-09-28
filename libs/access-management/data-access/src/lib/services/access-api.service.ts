import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { PermissionRecord, RoleAssignmentCreate, RoleAssignmentRecord } from '@warehouse/access-management/util';
import { ACCESS_MANAGEMENT_CONFIG } from '@warehouse/access-management/util';
import type { Observable } from 'rxjs';

@Injectable()
export class AccessApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(ACCESS_MANAGEMENT_CONFIG).apiUrl;

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
