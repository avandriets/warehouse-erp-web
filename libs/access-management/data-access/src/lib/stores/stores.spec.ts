import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAccessManagement } from '@warehouse/access-management';

import { UsersStore } from './users.store';

describe('user resource store', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAccessManagement({ apiUrl: '/api' }),
        UsersStore,
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('routes Auth0 linking through UsersStore.update and updates the entity', () => {
    const store = TestBed.inject(UsersStore);
    store.update({ id: 'u1', payload: { auth0_subject: 'auth0|one' } }).subscribe();
    const request = http.expectOne('/api/identity/users/u1/auth0');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ auth0_subject: 'auth0|one' });
    request.flush({ id: 'u1', auth0_subject: 'auth0|one' });
    expect(store.entityById('u1')?.auth0_subject).toBe('auth0|one');
    http.expectNone(pending => pending.method === 'GET');
  });

  it('preserves users on refresh failure', () => {
    const store = TestBed.inject(UsersStore);
    store.load({ limit: 25, offset: 0 }).subscribe();
    http.expectOne('/api/identity/users?limit=25&offset=0').flush({ items: [{ id: 'u1' }], total: 1 });
    store.load({ limit: 25, offset: 0 }).subscribe();
    http.expectOne('/api/identity/users?limit=25&offset=0').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(store.entities().map(item => item.id)).toEqual(['u1']);
    expect(store.entityState()).toMatchObject({ resolved: true, rejected: true });
  });
});
