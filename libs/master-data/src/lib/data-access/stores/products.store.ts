import { inject, InjectionToken } from '@angular/core';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData, withEntityNotifications } from '@warehouse/shared';
import { map } from 'rxjs';

import type { Product, ProductCreate, ProductsQuery, ProductUpdate } from '../../types';
import { ProductsApiService } from '../services';

export const PRODUCT_UPDATE_MESSAGE = new InjectionToken<string>('Product update notification', {
  factory: () => 'Product saved.',
});

const productsEvents = eventGroup({
  source: 'Products API',
  events: {
    loadFailed: type<EntityDataFailure>(),
    retrieveFailed: type<EntityDataFailure>(),
    createFailed: type<EntityDataFailure>(),
    updateFailed: type<EntityDataFailure>(),
    created: type<EntityDataSuccess<Product>>(),
    updated: type<EntityDataSuccess<Product>>(),
  },
});

export const ProductsStore = signalStore(
  withEntityData<Product, ProductCreate, ProductsQuery, ProductUpdate>({
    adapter: () => {
      const api = inject(ProductsApiService);

      return {
        load: query => api.list(query).pipe(map(({ items, total }) => ({ entities: items, pagination: { total } }))),
        getById: id => api.get(String(id)),
        create: payload =>
          api.create({
            ...payload,
            code: payload.code.trim(),
            name: payload.name.trim(),
            description: payload.description?.trim() || null,
            brand: payload.brand?.trim() || null,
          }),
        update: (id, payload) =>
          api.update(String(id), {
            ...payload,
            ...(payload.brand === undefined ? {} : { brand: payload.brand?.trim() ?? '' }),
            ...(payload.name === undefined ? {} : { name: payload.name.trim() }),
            ...(payload.description === undefined ? {} : { description: payload.description?.trim() ?? '' }),
          }),
      };
    },
    events: productsEvents,
    errorMessage: apiError,
    errors: {
      load: 'Could not load products.',
      getById: 'Could not load the product.',
      create: 'Could not create the product.',
      update: 'Could not update the product.',
      remove: 'Could not archive the product.',
    },
  }),
  withEntityNotifications(productsEvents, () => ({
    created: 'Product created.',
    updated: inject(PRODUCT_UPDATE_MESSAGE),
  })),
);
