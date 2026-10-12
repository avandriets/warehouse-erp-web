import { inject, Injectable } from '@angular/core';
import type { EntityDataAdapter, EntityDataPage } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import type { PriceType, PriceTypeCreate, PriceTypesQuery, PriceTypeUpdate } from '../../types';
import { PriceTypesApiService } from './price-types-api.service';

@Injectable()
export class PriceTypesAdapterService implements EntityDataAdapter<
  PriceType,
  PriceTypeCreate,
  PriceTypesQuery,
  PriceTypeUpdate
> {
  private readonly api = inject(PriceTypesApiService);

  load(query: PriceTypesQuery): Observable<EntityDataPage<PriceType>> {
    return this.api.list(query).pipe(
      map(({ items, total }) => ({
        entities: items,
        pagination: { total },
      })),
    );
  }

  getById(id: string | number): Observable<PriceType> {
    return this.api.get(String(id));
  }

  create(payload: PriceTypeCreate): Observable<PriceType> {
    return this.api.create({ ...payload, code: payload.code.trim(), name: payload.name.trim() });
  }

  update(id: string | number, payload: PriceTypeUpdate): Observable<PriceType> {
    return this.api.update(String(id), {
      ...payload,
      ...(payload.name === undefined ? {} : { name: payload.name.trim() }),
    });
  }
}
