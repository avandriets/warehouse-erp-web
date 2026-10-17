import { inject, InjectionToken } from '@angular/core';
import { patchState, signalStore, type, withState } from '@ngrx/signals';
import { eventGroup, Events, withEventHandlers } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData, withEntityNotifications } from '@warehouse/shared';
import { filter, map, tap } from 'rxjs';

import type { Warehouse, WarehouseCreate, WarehouseEntityPage, WarehousesQuery, WarehouseUpdate } from '../../types';
import { WarehousesApiService } from '../services';

export const WAREHOUSE_UPDATE_MESSAGE = new InjectionToken<string>('Warehouse update notification', {
  factory: () => 'Warehouse saved.',
});

const warehousesEvents = eventGroup({
  source: 'Warehouses API',
  events: {
    loaded: type<EntityDataSuccess<WarehouseEntityPage>>(),
    loadFailed: type<EntityDataFailure>(),
    retrieveFailed: type<EntityDataFailure>(),
    createFailed: type<EntityDataFailure>(),
    updateFailed: type<EntityDataFailure>(),
    created: type<EntityDataSuccess<Warehouse>>(),
    updated: type<EntityDataSuccess<Warehouse>>(),
  },
});

export const WarehousesStore = signalStore(
  withState({ canCreate: false }),
  withEntityData<Warehouse, WarehouseCreate, WarehousesQuery, WarehouseUpdate>({
    adapter: () => {
      const api = inject(WarehousesApiService);

      return {
        load: query =>
          api
            .list(query)
            .pipe(
              map(({ items, total, can_create: canCreate }) => ({ entities: items, pagination: { total }, canCreate })),
            ),
        getById: id => api.get(String(id)),
        create: payload =>
          api.create({
            ...payload,
            code: payload.code.trim(),
            name: payload.name.trim(),
            description: payload.description?.trim() || null,
          }),
        update: (id, payload) =>
          api.update(String(id), {
            ...payload,
            ...(payload.name === undefined ? {} : { name: payload.name.trim() }),
            ...(payload.description === undefined ? {} : { description: payload.description?.trim() || null }),
          }),
      };
    },
    events: warehousesEvents,
    errorMessage: apiError,
    errors: {
      load: 'Could not load warehouses.',
      getById: 'Could not load the warehouse.',
      create: 'Could not create the warehouse.',
      update: 'Could not update the warehouse.',
      remove: 'Could not archive the warehouse.',
    },
  }),
  withEventHandlers(store => {
    const events = inject(Events);

    return {
      capabilities: events.on(warehousesEvents.loaded).pipe(
        filter(({ payload }) => store.ownsRequest(payload.correlationId)),
        tap(({ payload }) => patchState(store, { canCreate: payload.data.canCreate === true })),
      ),
    };
  }),
  withEntityNotifications(warehousesEvents, () => ({
    created: 'Warehouse created.',
    updated: inject(WAREHOUSE_UPDATE_MESSAGE),
  })),
);
