import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type {
  ProductBarcode,
  ProductBarcodeCreate,
  ProductBarcodeUpdate,
  ProductMeasurement,
  ProductMeasurementCreate,
  ProductPackage,
} from '../../types';

@Injectable()
export class ProductDetailsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(MASTER_DATA_CONFIG).apiUrl.replace(/\/$/, '')}/catalog`;

  barcodes(id: string): Observable<ProductBarcode[]> {
    return this.http.get<ProductBarcode[]>(`${this.base}/products/${encodeURIComponent(id)}/barcodes`);
  }

  createBarcode(id: string, payload: ProductBarcodeCreate): Observable<ProductBarcode> {
    return this.http.post<ProductBarcode>(`${this.base}/products/${encodeURIComponent(id)}/barcodes`, payload);
  }

  updateBarcode(productId: string, id: string, payload: ProductBarcodeUpdate): Observable<ProductBarcode> {
    return this.http.patch<ProductBarcode>(
      `${this.base}/products/${encodeURIComponent(productId)}/barcodes/${encodeURIComponent(id)}`,
      payload,
    );
  }

  measurements(id: string): Observable<ProductMeasurement[]> {
    return this.http.get<ProductMeasurement[]>(`${this.base}/products/${encodeURIComponent(id)}/measurements`);
  }

  createMeasurement(id: string, payload: ProductMeasurementCreate): Observable<ProductMeasurement> {
    return this.http.post<ProductMeasurement>(`${this.base}/products/${encodeURIComponent(id)}/measurements`, payload);
  }

  updateMeasurement(
    productId: string,
    id: string,
    payload: Partial<Omit<ProductMeasurementCreate, 'unit_id'>> & { active?: boolean },
  ): Observable<ProductMeasurement> {
    return this.http.patch<ProductMeasurement>(
      `${this.base}/products/${encodeURIComponent(productId)}/measurements/${encodeURIComponent(id)}`,
      payload,
    );
  }

  packages(id: string): Observable<ProductPackage[]> {
    return this.http.get<ProductPackage[]>(`${this.base}/package-sets/${encodeURIComponent(id)}/packages`);
  }
}
