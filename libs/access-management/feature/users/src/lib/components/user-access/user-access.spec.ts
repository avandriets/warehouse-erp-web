import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideAccessManagement } from '@warehouse/access-management';
import type { UserRecord } from '@warehouse/access-management/util';

import { UserAccess } from './user-access';

const user: UserRecord = {
  id: 'u1',
  auth0_subject: null,
  email: 'user@example.com',
  display_name: 'User',
  status: 'INVITED',
  created_at: '',
  updated_at: '',
};

describe('user access', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UserAccess],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAccessManagement({ apiUrl: '/api' })],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function create(): ComponentFixture<UserAccess> {
    const fixture = TestBed.createComponent(UserAccess);
    fixture.componentRef.setInput('user', { ...user });
    fixture.detectChanges();
    http.expectOne('/api/identity/roles').flush([]);
    http.expectOne('/api/identity/users/u1/role-assignments').flush([]);

    return fixture;
  }

  it('uses a null scope_id for global assignments', async () => {
    const fixture = create();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.assignmentForm.controls.roleId.setValue('r1');
    component.assignmentForm.controls.scope.setValue('GLOBAL');
    component.assignmentForm.controls.scopeId.setValue('stale-id');
    component.assignmentForm.markAsDirty();
    component.assign();
    const request = http.expectOne('/api/identity/users/u1/role-assignments');
    expect(request.request.body).toEqual({ role_id: 'r1', scope_type: 'GLOBAL', scope_id: null });
    request.flush({ id: 'a1' });
    http.expectNone(pending => pending.method === 'GET');
  });

  it('revokes exactly the selected assignment', async () => {
    const component = create().componentInstance;
    component.revoke('a1');
    const request = http.expectOne('/api/identity/users/u1/role-assignments/a1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    http.expectNone(pending => pending.method === 'GET');
  });
  it('cancels an Auth0 link when its dialog is destroyed', async () => {
    const fixture = create();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const updated = vi.fn();
    component.updated.subscribe(updated);
    component.linkForm.controls.subject.setValue('auth0|old');
    component.linkForm.markAsDirty();
    component.link();
    const old = http.expectOne('/api/identity/users/u1/auth0');
    fixture.destroy();
    expect(old.cancelled).toBe(true);
    expect(updated).not.toHaveBeenCalled();
    expect(component.auth0Subject()).toBeNull();
    http.expectNone(pending => pending.method === 'GET');
  });
  it('updates a linked user without reloading catalogs or assignments', async () => {
    const fixture = create();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const updated = vi.fn();
    component.updated.subscribe(updated);
    component.linkForm.controls.subject.setValue('auth0|linked');
    component.linkForm.markAsDirty();
    component.link();
    const linked = { ...user, auth0_subject: 'auth0|linked' };
    http.expectOne('/api/identity/users/u1/auth0').flush(linked);
    expect(updated).toHaveBeenCalledWith(linked);
    expect(component.auth0Subject()).toBe('auth0|linked');
    expect(component.busy()).toBe(false);
    http.expectNone(pending => pending.method === 'GET');
  });
  it('requires a UUID only for a scoped assignment', async () => {
    const fixture = create();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const form = component.assignmentForm;
    form.controls.roleId.setValue('r1');
    expect(form.valid).toBe(true);
    expect(form.controls.scopeId.disabled).toBe(true);
    form.controls.scope.setValue('WAREHOUSE');
    await fixture.whenStable();
    expect(form.controls.scopeId.enabled).toBe(true);
    expect(form.invalid).toBe(true);
    form.controls.scopeId.setValue('not-a-uuid');
    component.assign();
    http.expectNone(request => request.method === 'POST');
    form.controls.scopeId.setValue('00000000-0000-0000-0000-000000000001');
    expect(form.valid).toBe(true);
    form.controls.scope.setValue('GLOBAL');
    await fixture.whenStable();
    expect(form.controls.scopeId.disabled).toBe(true);
  });

  it('rejects a whitespace-only Auth0 subject', async () => {
    const fixture = create();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.linkForm.controls.subject.setValue('   ');
    expect(component.linkForm.invalid).toBe(true);
    component.link();
    http.expectNone('/api/identity/users/u1/auth0');
  });
});
