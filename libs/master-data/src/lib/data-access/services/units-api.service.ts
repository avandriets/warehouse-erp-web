import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type { Unit, UnitCreate, UnitsPage, UnitsQuery, UnitUpdate } from '../../types';

@Injectable()
export class UnitsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(MASTER_DATA_CONFIG).apiUrl.replace(/\/$/, '')}/catalog/units`;

  list(query: UnitsQuery): Observable<UnitsPage> {
    return this.http.get<UnitsPage>(this.base, {
      params: {
        limit: query.limit,
        offset: query.offset,
        ...(query.dimension ? { dimension: query.dimension } : {}),
        ...(query.root_only ? { root_only: true } : {}),
        ...(query.q ? { q: query.q } : {}),
        ...(query.active === undefined ? {} : { active: query.active }),
      },
    });
  }

  get(id: string): Observable<Unit> {
    return this.http.get<Unit>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(payload: UnitCreate): Observable<Unit> {
    return this.http.post<Unit>(this.base, payload);
  }

  update(id: string, payload: UnitUpdate): Observable<Unit> {
    return this.http.patch<Unit>(`${this.base}/${encodeURIComponent(id)}`, payload);
  }
}
