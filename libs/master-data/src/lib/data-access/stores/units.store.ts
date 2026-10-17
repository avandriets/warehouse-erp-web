import { inject, InjectionToken } from '@angular/core';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData, withEntityNotifications } from '@warehouse/shared';
import { map } from 'rxjs';

import type { Unit, UnitCreate, UnitsQuery, UnitUpdate } from '../../types';
import { normalizeUnit } from '../../types';
import { UnitsApiService } from '../services';

export const UNIT_UPDATE_MESSAGE = new InjectionToken<string>('Unit update notification', {
  factory: () => 'Unit saved.',
});

const unitsEvents = eventGroup({
  source: 'Units API',
  events: {
    loadFailed: type<EntityDataFailure>(),
    retrieveFailed: type<EntityDataFailure>(),
    createFailed: type<EntityDataFailure>(),
    updateFailed: type<EntityDataFailure>(),
    created: type<EntityDataSuccess<Unit>>(),
    updated: type<EntityDataSuccess<Unit>>(),
  },
});

export const UnitsStore = signalStore(
  withEntityData<Unit, UnitCreate, UnitsQuery, UnitUpdate>({
    adapter: () => {
      const api = inject(UnitsApiService);

      return {
        load: query => api.list(query).pipe(map(({ items, total }) => ({ entities: items, pagination: { total } }))),
        getById: id => api.get(String(id)),
        create: payload => api.create(normalizeUnit(payload)),
        update: (id, payload) => api.update(String(id), normalizeUnit(payload)),
      };
    },
    load: { pageParams: (query, offset, limit) => ({ ...query, offset, limit }) },
    events: unitsEvents,
    errorMessage: apiError,
    errors: {
      load: 'Could not load units.',
      getById: 'Could not load the unit.',
      create: 'Could not create the unit.',
      update: 'Could not update the unit.',
      remove: 'Could not archive the unit.',
    },
  }),
  withEntityNotifications(unitsEvents, () => ({ created: 'Unit created.', updated: inject(UNIT_UPDATE_MESSAGE) })),
);
