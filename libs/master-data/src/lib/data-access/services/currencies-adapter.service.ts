import { inject, Injectable } from '@angular/core';
import type { EntityDataAdapter, EntityDataPage } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import type { CurrenciesQuery, Currency, CurrencyCreate, CurrencyUpdate } from '../../types';
import { CurrenciesApiService } from './currencies-api.service';

@Injectable()
export class CurrenciesAdapterService implements EntityDataAdapter<
  Currency,
  CurrencyCreate,
  CurrenciesQuery,
  CurrencyUpdate
> {
  private readonly api = inject(CurrenciesApiService);

  load(query: CurrenciesQuery): Observable<EntityDataPage<Currency>> {
    return this.api.list(query).pipe(
      map(({ items, total }) => ({
        entities: items,
        pagination: { total },
      })),
    );
  }

  getById(id: string | number): Observable<Currency> {
    return this.api.get(String(id));
  }

  create(payload: CurrencyCreate): Observable<Currency> {
    return this.api.create({
      ...payload,
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      symbol: payload.symbol.trim(),
    });
  }

  update(id: string | number, payload: CurrencyUpdate): Observable<Currency> {
    return this.api.update(String(id), {
      ...payload,
      ...(payload.name === undefined ? {} : { name: payload.name.trim() }),
    });
  }
}
