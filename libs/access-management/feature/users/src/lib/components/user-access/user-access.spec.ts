import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
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
    const component = create().componentInstance;
    component.assignmentForm.controls.roleId.setValue('r1');
    component.assignmentForm.controls.scope.setValue('GLOBAL');
    component.assignmentForm.controls.scopeId.setValue('stale-id');
    component.assign();
    const request = http.expectOne('/api/identity/users/u1/role-assignments');
    expect(request.request.body).toEqual({ role_id: 'r1', scope_type: 'GLOBAL', scope_id: null });
    request.flush({ id: 'a1' });
    await vi.waitFor(() => http.expectOne('/api/identity/roles').flush([]));
    http.expectOne('/api/identity/users/u1/role-assignments').flush([]);
  });

  it('revokes exactly the selected assignment', async () => {
    const component = create().componentInstance;
    component.revoke('a1');
    const request = http.expectOne('/api/identity/users/u1/role-assignments/a1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    await vi.waitFor(() => http.expectOne('/api/identity/roles').flush([]));
    http.expectOne('/api/identity/users/u1/role-assignments').flush([]);
  });
  it('does not publish an old Auth0 link after changing the selected user', async () => {
    const fixture = create();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const updated = vi.fn();
    component.updated.subscribe(updated);
    component.linkForm.controls.subject.setValue('auth0|old');
    component.link();
    const old = http.expectOne('/api/identity/users/u1/auth0');
    fixture.componentRef.setInput('user', { ...user, id: 'u2' });
    await vi.waitFor(() => {
      http.expectOne('/api/identity/roles').flush([]);
      http.expectOne('/api/identity/users/u2/role-assignments').flush([]);
    });
    await fixture.whenStable();
    expect(old.cancelled).toBe(true);
    expect(updated).not.toHaveBeenCalled();
    expect(component.auth0Subject()).toBeNull();
    http.expectNone(request => request.method === 'GET');
  });
  it('keeps a successful link when the subsequent reload fails and unlocks the form', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const updated = vi.fn();
    component.updated.subscribe(updated);
    component.linkForm.controls.subject.setValue('auth0|linked');
    component.link();
    const linked = { ...user, auth0_subject: 'auth0|linked' };
    http.expectOne('/api/identity/users/u1/auth0').flush(linked);
    expect(updated).toHaveBeenCalledWith(linked);
    expect(component.auth0Subject()).toBe('auth0|linked');
    expect(component.busy()).toBe(true);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const assign = await loader.getHarness(MatButtonHarness.with({ text: 'Assign role' }));
    expect(await assign.isDisabled()).toBe(true);
    await assign.click();
    http.expectNone('/api/identity/users/u1/auth0');
    http.expectOne('/api/identity/roles').flush([]);
    http.expectOne('/api/identity/users/u1/role-assignments').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(component.busy()).toBe(false);
    expect(component.auth0Subject()).toBe('auth0|linked');
    expect(component.store.error()).toBeTruthy();
  });
  it('requires a UUID only for a scoped assignment and resets on user change', async () => {
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
    fixture.componentRef.setInput('user', { ...user, id: 'u2' });
    fixture.detectChanges();
    http.expectOne('/api/identity/roles').flush([]);
    http.expectOne('/api/identity/users/u2/role-assignments').flush([]);
    await fixture.whenStable();
    expect(form.getRawValue()).toEqual({ roleId: '', scope: 'GLOBAL', scopeId: '' });
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
