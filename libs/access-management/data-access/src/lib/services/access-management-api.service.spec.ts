import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAccessManagement } from '@warehouse/access-management';

import { AccessManagementApiService } from './access-management-api.service';

describe('AccessManagementApiService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAccessManagement({ apiUrl: '/api' })],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('keeps HTTP requests cold and supports cancellation', () => {
    const api = TestBed.inject(AccessManagementApiService);
    const http = TestBed.inject(HttpTestingController);
    const request = api.listUsers(25, 50, 'ACTIVE');
    http.expectNone(() => true);
    const subscription = request.subscribe();
    const pending = http.expectOne('/api/identity/users?limit=25&offset=50&status=ACTIVE');
    subscription.unsubscribe();
    expect(pending.cancelled).toBe(true);
  });

  it('loads individual users and roles for direct editor routes', () => {
    const api = TestBed.inject(AccessManagementApiService);
    const http = TestBed.inject(HttpTestingController);
    api.getUser('u1').subscribe();
    api.getRole('r1').subscribe();
    expect(http.expectOne('/api/identity/users/u1').request.method).toBe('GET');
    expect(http.expectOne('/api/identity/roles/r1').request.method).toBe('GET');
  });
});
