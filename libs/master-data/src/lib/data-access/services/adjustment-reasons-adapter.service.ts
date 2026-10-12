import { inject, Injectable } from '@angular/core';
import type { EntityDataAdapter, EntityDataPage } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import type {
  AdjustmentReason,
  AdjustmentReasonCreate,
  AdjustmentReasonsQuery,
  AdjustmentReasonUpdate,
} from '../../types';
import { AdjustmentReasonsApiService } from './adjustment-reasons-api.service';

@Injectable()
export class AdjustmentReasonsAdapterService implements EntityDataAdapter<
  AdjustmentReason,
  AdjustmentReasonCreate,
  AdjustmentReasonsQuery,
  AdjustmentReasonUpdate
> {
  private readonly api = inject(AdjustmentReasonsApiService);

  load(query: AdjustmentReasonsQuery): Observable<EntityDataPage<AdjustmentReason>> {
    return this.api.list(query).pipe(
      map(({ items, total }) => ({
        entities: items,
        pagination: { total },
      })),
    );
  }

  getById(id: string | number): Observable<AdjustmentReason> {
    return this.api.get(String(id));
  }

  create(payload: AdjustmentReasonCreate): Observable<AdjustmentReason> {
    return this.api.create({ ...payload, code: payload.code.trim(), name: payload.name.trim() });
  }

  update(id: string | number, payload: AdjustmentReasonUpdate): Observable<AdjustmentReason> {
    return this.api.update(String(id), {
      ...payload,
      ...(payload.name === undefined ? {} : { name: payload.name.trim() }),
    });
  }
}
