import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { AUTH_CONFIG } from '../providers';
import type { CurrentUser } from '../types';

@Injectable({ providedIn: 'root' })
export class IdentityApiService {
  private readonly config = inject(AUTH_CONFIG);
  private readonly http = inject(HttpClient);

  getCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.config.apiUrl}/identity/me`);
  }
}
