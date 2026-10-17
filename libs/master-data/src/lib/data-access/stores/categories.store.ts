import { inject, InjectionToken } from '@angular/core';
import { patchState, signalStore, type, withState } from '@ngrx/signals';
import { eventGroup, Events, withEventHandlers } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData, withEntityNotifications } from '@warehouse/shared';
import { filter, map, tap } from 'rxjs';

import type {
  CategoriesQuery,
  Category,
  CategoryCreate,
  CategoryEntityPage,
  CategoryReference,
  CategoryUpdate,
} from '../../types';
import { CategoriesApiService } from '../services';

export const CATEGORY_UPDATE_MESSAGE = new InjectionToken<string>('Category update notification', {
  factory: () => 'Category saved.',
});

const categoriesEvents = eventGroup({
  source: 'Categories API',
  events: {
    loaded: type<EntityDataSuccess<CategoryEntityPage>>(),
    loadFailed: type<EntityDataFailure>(),
    retrieveFailed: type<EntityDataFailure>(),
    createFailed: type<EntityDataFailure>(),
    updateFailed: type<EntityDataFailure>(),
    created: type<EntityDataSuccess<Category>>(),
    updated: type<EntityDataSuccess<Category>>(),
  },
});

export const CategoriesStore = signalStore(
  withState({ ancestors: [] as CategoryReference[], pathParentId: null as string | null }),
  withEntityData<Category, CategoryCreate, CategoriesQuery, CategoryUpdate>({
    adapter: () => {
      const api = inject(CategoriesApiService);

      return {
        load: query =>
          api.list(query).pipe(
            map(({ items, total, ancestors }) => ({
              entities: items,
              pagination: { total },
              ancestors: ancestors ?? [],
              parentId: query.parent_id ?? null,
            })),
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
    load: { pageParams: (query, offset, limit) => ({ ...query, offset, limit }) },
    events: categoriesEvents,
    errorMessage: apiError,
    errors: {
      load: 'Could not load categories.',
      getById: 'Could not load the category.',
      create: 'Could not create the category.',
      update: 'Could not update the category.',
      remove: 'Could not archive the category.',
    },
  }),
  withEventHandlers(store => {
    const events = inject(Events);

    return {
      path: events.on(categoriesEvents.loaded).pipe(
        filter(({ payload }) => store.ownsRequest(payload.correlationId)),
        tap(({ payload }) =>
          patchState(store, { ancestors: payload.data.ancestors ?? [], pathParentId: payload.data.parentId ?? null }),
        ),
      ),
    };
  }),
  withEntityNotifications(categoriesEvents, () => ({
    created: 'Category created.',
    updated: inject(CATEGORY_UPDATE_MESSAGE),
  })),
);
