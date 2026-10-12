import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type {
  AdjustmentReason,
  AdjustmentReasonCreate,
  AdjustmentReasonsPage,
  AdjustmentReasonsQuery,
  AdjustmentReasonUpdate,
} from '../../types';

@Injectable()
export class AdjustmentReasonsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(MASTER_DATA_CONFIG).apiUrl.replace(/\/$/, '')}/reference-data/adjustment-reasons`;

  list(query: AdjustmentReasonsQuery): Observable<AdjustmentReasonsPage> {
    return this.http.get<AdjustmentReasonsPage>(this.base, {
      params: {
        limit: query.limit,
        offset: query.offset,
        ...(query.q ? { q: query.q } : {}),
        ...(query.active === undefined ? {} : { active: query.active }),
      },
    });
  }

  get(id: string): Observable<AdjustmentReason> {
    return this.http.get<AdjustmentReason>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(payload: AdjustmentReasonCreate): Observable<AdjustmentReason> {
    return this.http.post<AdjustmentReason>(this.base, payload);
  }

  update(id: string, payload: AdjustmentReasonUpdate): Observable<AdjustmentReason> {
    return this.http.patch<AdjustmentReason>(`${this.base}/${encodeURIComponent(id)}`, payload);
  }
}
