import { inject } from '@angular/core';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData, withEntityNotifications } from '@warehouse/shared';
import { map } from 'rxjs';

import type { ProductBarcode, ProductBarcodeCreate, ProductBarcodeUpdate } from '../../types';
import { ProductDetailsApiService } from '../services';
const eventsGroup = eventGroup({
  source: 'Product barcodes API',
  events: {
    loadFailed: type<EntityDataFailure>(),
    createFailed: type<EntityDataFailure>(),
    updateFailed: type<EntityDataFailure>(),
    created: type<EntityDataSuccess<ProductBarcode>>(),
    updated: type<EntityDataSuccess<ProductBarcode>>(),
  },
});

export const ProductBarcodesStore = signalStore(
  withEntityData<
    ProductBarcode,
    { productId: string; payload: ProductBarcodeCreate },
    string,
    { productId: string; payload: ProductBarcodeUpdate }
  >({
    adapter: () => {
      const api = inject(ProductDetailsApiService);

      return {
        load: productId => api.barcodes(productId).pipe(map(entities => ({ entities }))),
        create: request => api.createBarcode(request.productId, request.payload),
        update: (id, request) => api.updateBarcode(request.productId, String(id), request.payload),
      };
    },
    events: eventsGroup,
    errorMessage: apiError,
    errors: {
      load: 'Could not load barcodes.',
      create: 'Could not add barcode.',
      update: 'Could not update barcode.',
      remove: 'Could not archive barcode.',
    },
  }),
  withEntityNotifications(eventsGroup, () => ({ created: 'Barcode added.', updated: 'Barcode saved.' })),
);
