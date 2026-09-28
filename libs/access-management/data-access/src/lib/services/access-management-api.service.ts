import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
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

  listUsers(limit = 25, offset = 0, status?: UserStatus, q?: string): Observable<UserRecord[]> {
    const params: Record<string, string | number> = { limit, offset };
    if (status) {
      params['status'] = status;
    }
    if (q) {
      params['q'] = q;
    }

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

  listRoles(active?: boolean, q?: string): Observable<RoleRecord[]> {
    const params: Record<string, string | boolean> = {};
    if (active !== undefined) {
      params['active'] = active;
    }
    if (q) {
      params['q'] = q;
    }

    return this.http.get<RoleRecord[]>(`${this.base}/identity/roles`, { params });
  }

  createRole(payload: RoleCreate): Observable<RoleRecord> {
    return this.http.post<RoleRecord>(`${this.base}/identity/roles`, payload);
  }

  updateRole(roleId: string, payload: RoleUpdate): Observable<RoleRecord> {
    return this.http.patch<RoleRecord>(`${this.base}/identity/roles/${roleId}`, payload);
  }
}
