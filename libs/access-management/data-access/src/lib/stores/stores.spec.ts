import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAccessManagement } from '@warehouse/access-management';
import { firstValueFrom } from 'rxjs';

import { AccessManagementApiService } from '../services';
import { RolePermissionsStore } from './role-permissions.store';
import { UserAccessStore } from './user-access.store';
import { UsersStore } from './users.store';

describe('access-management signal stores', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAccessManagement({ apiUrl: '/api' }),
        UserAccessStore,
        UsersStore,
        RolePermissionsStore,
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('ignores an old user response after switching the selected user', async () => {
    const store = TestBed.inject(UserAccessStore);
    const first = firstValueFrom(store.load('u1'), { defaultValue: undefined });
    const firstRoles = http.expectOne('/api/identity/roles');
    const firstAssignments = http.expectOne('/api/identity/users/u1/role-assignments');
    const second = firstValueFrom(store.load('u2'), { defaultValue: undefined });
    http.expectOne('/api/identity/roles').flush([]);
    http.expectOne('/api/identity/users/u2/role-assignments').flush([{ id: 'a2' }]);
    await second;
    firstRoles.flush([]);
    firstAssignments.flush([{ id: 'a1' }]);
    await first;
    expect(store.assignments().map(item => item.id)).toEqual(['a2']);
  });

  it('does not apply a previous user mutation to the new selection', async () => {
    const store = TestBed.inject(UserAccessStore);
    const initial = firstValueFrom(store.load('u1'), { defaultValue: undefined });
    http.expectOne('/api/identity/roles').flush([]);
    http.expectOne('/api/identity/users/u1/role-assignments').flush([]);
    await initial;
    const api = TestBed.inject(AccessManagementApiService);
    const link = firstValueFrom(
      store.mutate(() => api.linkAuth0('u1', 'auth0|old')),
      { defaultValue: undefined },
    );
    store.resetMutation();
    store.reset();
    const request = http.expectOne('/api/identity/users/u1/auth0');
    const switched = firstValueFrom(store.load('u2'), { defaultValue: undefined });
    http.expectOne('/api/identity/roles').flush([]);
    http.expectOne('/api/identity/users/u2/role-assignments').flush([]);
    await switched;
    expect(request.cancelled).toBe(true);
    expect(await link).toBeUndefined();
    expect(store.saving()).toBe(false);
    http.expectNone('/api/identity/users/u1/role-assignments');
  });

  it('loads explicitly supplied parameters and preserves data on refresh failure', async () => {
    const store = TestBed.inject(UsersStore);
    const initial = firstValueFrom(store.load({ limit: 25, offset: 0 }), { defaultValue: undefined });
    http.expectOne('/api/identity/users?limit=25&offset=0').flush([{ id: 'u1' }]);
    await initial;
    const refresh = firstValueFrom(store.load({ limit: 25, offset: 0 }), { defaultValue: undefined });
    http.expectOne('/api/identity/users?limit=25&offset=0').flush({}, { status: 503, statusText: 'Unavailable' });
    await refresh;
    expect(store.entities().map(item => item.id)).toEqual(['u1']);
    expect(store.entityState()).toMatchObject({ resolved: true, rejected: true });
    store.reset();
    const filter = firstValueFrom(store.load({ limit: 25, offset: 0, status: 'SUSPENDED' }), {
      defaultValue: undefined,
    });
    expect(store.entities()).toEqual([]);
    expect(store.loaded()).toBe(false);
    http.expectOne('/api/identity/users?limit=25&offset=0&status=SUSPENDED').flush([]);
    await filter;
    expect(store.entityState()).toMatchObject({ resolved: true, rejected: false, empty: true });
  });

  it('prevents duplicate permission writes and keeps data on failure', async () => {
    const store = TestBed.inject(RolePermissionsStore);
    const load = firstValueFrom(store.load('r1'), { defaultValue: undefined });
    http.expectOne('/api/identity/permissions').flush([{ id: 'p1', code: 'users.manage' }]);
    http.expectOne('/api/identity/roles/r1/permissions').flush([]);
    await load;
    const api = TestBed.inject(AccessManagementApiService);
    const save = firstValueFrom(
      store.mutate(() => api.replaceRolePermissions('r1', ['users.manage'])),
      { defaultValue: undefined },
    );
    expect(
      await firstValueFrom(
        store.mutate(() => api.replaceRolePermissions('r1', [])),
        { defaultValue: undefined },
      ),
    ).toBeUndefined();
    http
      .expectOne('/api/identity/roles/r1/permissions')
      .flush({ detail: 'Write denied' }, { status: 409, statusText: 'Conflict' });
    expect(await save).toBeUndefined();
    expect(store.permissions()).toHaveLength(1);
    expect(store.actionError()).toBe('Write denied');
    expect(store.requestState().resolved).toBe(true);
  });
});
