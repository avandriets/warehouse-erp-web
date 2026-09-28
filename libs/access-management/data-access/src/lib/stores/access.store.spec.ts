import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAccessManagement } from '@warehouse/access-management';

import { AccessApiService } from '../services';
import { AccessStore } from './access.store';

const payload = { role_id: 'r1', scope_type: 'GLOBAL', scope_id: null } as const;

describe('AccessStore', () => {
  let http: HttpTestingController;
  let store: InstanceType<typeof AccessStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAccessManagement({ apiUrl: '/api' }),
        AccessApiService,
        AccessStore,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AccessStore);
  });
  afterEach(() => http.verify());

  it('keeps requests cold and tracks independent resource states', () => {
    const request = store.listPermissions();
    http.expectNone(() => true);
    request.subscribe();
    store.listRolePermissions('r1').subscribe();
    store.listRoleAssignments('u1').subscribe();
    http.expectOne('/api/identity/permissions').flush([{ id: 'p1', code: 'users.manage' }]);
    http.expectOne('/api/identity/roles/r1/permissions').flush({}, { status: 403, statusText: 'Forbidden' });
    expect(store.permissionsLoaded()).toBe(true);
    expect(store.rolePermissionsState()).toMatchObject({ resolved: false, rejected: true });
    expect(store.roleAssignmentsLoading()).toBe(true);
    http.expectOne('/api/identity/users/u1/role-assignments').flush([]);
    expect(store.roleAssignmentsState()).toMatchObject({ resolved: true, rejected: false, pending: false });
  });

  it('updates assigned permissions from the response without refetching', () => {
    store.listRolePermissions('r1').subscribe();
    http.expectOne('/api/identity/roles/r1/permissions').flush([]);
    store.replaceRolePermissions('r1', ['users.manage']).subscribe();
    const request = http.expectOne('/api/identity/roles/r1/permissions');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ permission_codes: ['users.manage'] });
    request.flush([{ id: 'p1', code: 'users.manage' }]);
    expect(store.rolePermissions.data()).toEqual([{ id: 'p1', code: 'users.manage' }]);
    expect(store.rolePermissionsSaving()).toBe(false);
    http.expectNone(pending => pending.method === 'GET');
  });

  it('preserves assignments and exposes write errors, then allows retry', () => {
    store.listRoleAssignments('u1').subscribe();
    http.expectOne('/api/identity/users/u1/role-assignments').flush([{ id: 'a1' }]);
    store.revokeRoleAssignment('u1', 'a1').subscribe();
    store.revokeRoleAssignment('u1', 'a1').subscribe();
    http
      .expectOne('/api/identity/users/u1/role-assignments/a1')
      .flush({ detail: 'Denied' }, { status: 409, statusText: 'Conflict' });
    expect(store.roleAssignments.data()).toEqual([{ id: 'a1' }]);
    expect(store.roleAssignmentsActionError()).toBe('Denied');
    store.revokeRoleAssignment('u1', 'a1').subscribe();
    expect(store.roleAssignmentsActionError()).toBeNull();
    const request = http.expectOne('/api/identity/users/u1/role-assignments/a1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    expect(store.roleAssignments.data()).toEqual([]);
    expect(store.roleAssignmentsSaving()).toBe(false);
    http.expectNone(pending => pending.method === 'GET');
  });

  it('isolates dialog instances and uses assignment responses without reloading', () => {
    const injector = Injector.create({ parent: TestBed.inject(Injector), providers: [AccessApiService, AccessStore] });
    const other = injector.get(AccessStore);
    store.listRoleAssignments('u1').subscribe();
    other.listRoleAssignments('u2').subscribe();
    http.expectOne('/api/identity/users/u1/role-assignments').flush([]);
    http.expectOne('/api/identity/users/u2/role-assignments').flush([{ id: 'a2' }]);
    store.assignRole('u1', payload).subscribe();
    const request = http.expectOne('/api/identity/users/u1/role-assignments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ id: 'a1' });
    expect(store.roleAssignments.data()).toEqual([{ id: 'a1' }]);
    expect(other.roleAssignments.data()).toEqual([{ id: 'a2' }]);
    http.expectNone(pending => pending.method === 'GET');
    injector.destroy();
  });

  it('cancels stale reads and keeps loaded data after a refresh error', () => {
    store.listPermissions().subscribe();
    const old = http.expectOne('/api/identity/permissions');
    store.listPermissions().subscribe();
    expect(old.cancelled).toBe(true);
    http.expectOne('/api/identity/permissions').flush([{ id: 'p1' }]);
    store.listPermissions().subscribe();
    http.expectOne('/api/identity/permissions').flush({}, { status: 500, statusText: 'Error' });
    expect(store.permissions.data()).toEqual([{ id: 'p1' }]);
    expect(store.permissionsState()).toMatchObject({ resolved: true, rejected: true, pending: false });
  });

  it('cancels a pending read before writing and skips reads and duplicate writes while saving', () => {
    store.listRolePermissions('r1').subscribe();
    const read = http.expectOne('/api/identity/roles/r1/permissions');
    store.replaceRolePermissions('r1', []).subscribe();
    expect(read.cancelled).toBe(true);
    const write = http.expectOne('/api/identity/roles/r1/permissions');
    store.listRolePermissions('r1').subscribe();
    store.replaceRolePermissions('r1', []).subscribe();
    http.expectNone('/api/identity/roles/r1/permissions');
    write.flush([{ id: 'p1' }]);
    expect(store.rolePermissions.data()).toEqual([{ id: 'p1' }]);
    expect(store.rolePermissionsLoading()).toBe(false);
  });

  it('cancels old writes and discards data when changing resource context', () => {
    store.listRoleAssignments('u1').subscribe();
    http.expectOne('/api/identity/users/u1/role-assignments').flush([{ id: 'a1' }]);
    const accepted = vi.fn();
    store.assignRole('u1', payload).subscribe(accepted);
    const old = http.expectOne('/api/identity/users/u1/role-assignments');
    store.listRoleAssignments('u2').subscribe();
    expect(old.cancelled).toBe(true);
    expect(accepted).not.toHaveBeenCalled();
    expect(store.roleAssignments.data()).toEqual([]);
    http.expectOne('/api/identity/users/u2/role-assignments').flush([{ id: 'a2' }]);
    expect(store.roleAssignments.contextId()).toBe('u2');
    expect(store.roleAssignments.data()).toEqual([{ id: 'a2' }]);
  });

  it.each(['unsubscribe', 'reset', 'destroy'] as const)('cancels requests on %s and clears pending state', mode => {
    const injector = Injector.create({ parent: TestBed.inject(Injector), providers: [AccessApiService, AccessStore] });
    const local = injector.get(AccessStore);
    const accepted = vi.fn();
    const read = local.listPermissions().subscribe();
    const write = local.replaceRolePermissions('r1', []).subscribe(accepted);
    const pendingRead = http.expectOne('/api/identity/permissions');
    const pendingWrite = http.expectOne('/api/identity/roles/r1/permissions');
    if (mode === 'unsubscribe') {
      read.unsubscribe();
      write.unsubscribe();
    }
    if (mode === 'reset') {
      local.reset();
    }
    if (mode === 'destroy') {
      injector.destroy();
    }
    expect(pendingRead.cancelled).toBe(true);
    expect(pendingWrite.cancelled).toBe(true);
    expect(accepted).not.toHaveBeenCalled();
    expect(local.permissionsLoading()).toBe(false);
    expect(local.rolePermissionsSaving()).toBe(false);
    if (mode !== 'destroy') {
      injector.destroy();
    }
  });
});
