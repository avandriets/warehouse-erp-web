import { inject } from '@angular/core';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData, withEntityNotifications } from '@warehouse/shared';
import { map } from 'rxjs';

import type { ProductMeasurement, ProductMeasurementCreate } from '../../types';
import { ProductDetailsApiService } from '../services';
const eventsGroup = eventGroup({
  source: 'Product measurements API',
  events: {
    loadFailed: type<EntityDataFailure>(),
    createFailed: type<EntityDataFailure>(),
    updateFailed: type<EntityDataFailure>(),
    created: type<EntityDataSuccess<ProductMeasurement>>(),
    updated: type<EntityDataSuccess<ProductMeasurement>>(),
  },
});

export const ProductMeasurementsStore = signalStore(
  withEntityData<
    ProductMeasurement,
    { productId: string; payload: ProductMeasurementCreate },
    string,
    { productId: string; payload: Partial<Omit<ProductMeasurementCreate, 'unit_id'>> & { active?: boolean } }
  >({
    adapter: () => {
      const api = inject(ProductDetailsApiService);

      return {
        load: productId => api.measurements(productId).pipe(map(entities => ({ entities }))),
        create: request => api.createMeasurement(request.productId, request.payload),
        update: (id, request) => api.updateMeasurement(request.productId, String(id), request.payload),
      };
    },
    events: eventsGroup,
    errorMessage: apiError,
    errors: {
      load: 'Could not load measurements.',
      create: 'Could not add measurement.',
      update: 'Could not update measurement.',
      remove: 'Could not archive measurement.',
    },
  }),
  withEntityNotifications(eventsGroup, () => ({ created: 'Measurement added.', updated: 'Measurement saved.' })),
);
