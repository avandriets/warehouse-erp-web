import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AUTH_CONFIG } from '@warehouse/auth';
import type { ReferenceOption, ReferenceOptionsPage } from '@warehouse/shared';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CurrencyLookupService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(AUTH_CONFIG).apiUrl.replace(/\/$/, '')}/reference-data/currencies`;

  search(query: string): Observable<ReferenceOptionsPage> {
    return this.http.get<ReferenceOptionsPage>(this.base, {
      params: { active: true, limit: 25, offset: 0, ...(query.trim() ? { q: query.trim() } : {}) },
    });
  }

  get(id: string): Observable<ReferenceOption> {
    return this.http.get<ReferenceOption>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
