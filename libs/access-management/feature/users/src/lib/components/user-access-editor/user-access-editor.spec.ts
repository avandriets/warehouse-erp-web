import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideAccessManagement } from '@warehouse/access-management';
import type { RoleAssignmentRecord, RoleRecord, UserRecord } from '@warehouse/access-management/util';

import type { AccountLinkDialog, RoleAssignmentDialog } from '..';
import { UserAccessEditor } from './user-access-editor';

const user: UserRecord = {
  id: 'u1',
  auth0_subject: null,
  email: 'user@example.com',
  first_name: 'User',
  last_name: null,
  display_name: 'User',
  status: 'INVITED',
  created_at: '',
  updated_at: '',
};
const role: RoleRecord = {
  id: 'r1',
  code: 'MANAGER',
  name: 'Manager',
  active: true,
  system_role: false,
  description: null,
  created_at: '',
  updated_at: '',
};
const assignment: RoleAssignmentRecord = {
  id: 'a1',
  user_id: 'u1',
  role_id: 'r1',
  scope_type: 'GLOBAL',
  scope_id: null,
  created_at: '',
};

describe('user access', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UserAccessEditor],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAccessManagement({ apiUrl: '/api' })],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function create(assignments: RoleAssignmentRecord[] = []): Promise<ComponentFixture<UserAccessEditor>> {
    const fixture = TestBed.createComponent(UserAccessEditor);
    fixture.componentRef.setInput('user', { ...user });
    fixture.detectChanges();
    http.expectOne('/api/identity/roles').flush([role, { ...role, id: 'inactive', active: false }]);
    http.expectOne('/api/identity/users/u1/role-assignments').flush(assignments);
    await fixture.whenStable();

    return fixture;
  }

  function linkDialog(): AccountLinkDialog {
    return TestBed.inject(MatDialog).openDialogs[0].componentInstance as AccountLinkDialog;
  }

  function assignmentDialog(): RoleAssignmentDialog {
    return TestBed.inject(MatDialog).openDialogs[0].componentInstance as RoleAssignmentDialog;
  }

  it('shows assigned roles in a table without inline editing forms', async () => {
    const fixture = await create([assignment]);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('form')).toBeNull();
    expect(element.querySelector('input')).toBeNull();
    expect(element.querySelector('table')?.textContent).toContain('Manager');
    expect(element.textContent).toContain('No account linked.');
  });

  it('adds a global role through a dialog and refreshes only assignments', async () => {
    const fixture = await create();
    fixture.componentInstance.openAssignment();
    const dialog = assignmentDialog();
    await fixture.whenStable();
    expect(dialog.roles).toEqual([role]);
    dialog.form.controls.roleId.setValue('r1');
    dialog.form.controls.scopeId.setValue('stale-id');
    dialog.form.markAsDirty();
    dialog.save();
    dialog.save();
    const request = http.expectOne('/api/identity/users/u1/role-assignments');
    expect(request.request.body).toEqual({ role_id: 'r1', scope_type: 'GLOBAL', scope_id: null });
    request.flush(assignment);
    await vi.waitFor(() => http.expectOne('/api/identity/users/u1/role-assignments').flush([assignment]));
    await fixture.whenStable();
    expect(fixture.componentInstance.assignments()).toEqual([assignment]);
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0);
    http.expectNone('/api/identity/roles');
  });

  it('requires a valid UUID for a scoped assignment', async () => {
    const fixture = await create();
    fixture.componentInstance.openAssignment();
    const dialog = assignmentDialog();
    await fixture.whenStable();
    dialog.form.controls.roleId.setValue('r1');
    dialog.form.markAsDirty();
    expect(dialog.form.controls.scopeId.disabled).toBe(true);
    dialog.form.controls.scope.setValue('WAREHOUSE');
    await fixture.whenStable();
    expect(dialog.form.controls.scopeId.enabled).toBe(true);
    dialog.form.controls.scopeId.setValue('not-a-uuid');
    dialog.save();
    http.expectNone(request => request.method === 'POST');
    const scopeId = '00000000-0000-0000-0000-000000000001';
    dialog.form.controls.scopeId.setValue(scopeId);
    dialog.save();
    const request = http.expectOne('/api/identity/users/u1/role-assignments');
    expect(request.request.body).toEqual({ role_id: 'r1', scope_type: 'WAREHOUSE', scope_id: scopeId });
    request.flush({ ...assignment, scope_type: 'WAREHOUSE', scope_id: scopeId });
    await vi.waitFor(() => http.expectOne('/api/identity/users/u1/role-assignments').flush([]));
  });

  it('keeps assignment values and errors inside the dialog after a failed write', async () => {
    const fixture = await create();
    fixture.componentInstance.openAssignment();
    const dialog = assignmentDialog();
    await fixture.whenStable();
    dialog.form.controls.roleId.setValue('r1');
    dialog.form.markAsDirty();
    dialog.save();
    http
      .expectOne('/api/identity/users/u1/role-assignments')
      .flush({ detail: 'Role already assigned' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(dialog.form.controls.roleId.value).toBe('r1');
    expect(dialog.actionError()).toBe('Role already assigned');
    expect(dialog.canSave).toBe(true);
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeNull();
    dialog.save();
    http.expectOne('/api/identity/users/u1/role-assignments').flush(assignment);
    await vi.waitFor(() => http.expectOne('/api/identity/users/u1/role-assignments').flush([assignment]));
  });

  it('links the account through a dialog and updates its displayed subject', async () => {
    const fixture = await create();
    fixture.componentInstance.openLink();
    const dialog = linkDialog();
    dialog.form.controls.subject.setValue('  auth0|linked  ');
    dialog.form.markAsDirty();
    dialog.save();
    const request = http.expectOne('/api/identity/users/u1/auth0');
    expect(request.request.body).toEqual({ auth0_subject: 'auth0|linked' });
    request.flush({ ...user, auth0_subject: 'auth0|linked' });
    await vi.waitFor(() => expect(fixture.componentInstance.auth0Subject()).toBe('auth0|linked'));
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('auth0|linked');
    fixture.componentInstance.openLink();
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0);
    http.expectNone(pending => pending.method === 'GET');
  });

  it('rejects blank subjects and preserves the account draft after a failed write', async () => {
    const fixture = await create();
    fixture.componentInstance.openLink();
    const dialog = linkDialog();
    dialog.form.controls.subject.setValue('   ');
    dialog.form.markAsDirty();
    dialog.save();
    http.expectNone('/api/identity/users/u1/auth0');
    dialog.form.controls.subject.setValue('auth0|draft');
    dialog.save();
    http
      .expectOne('/api/identity/users/u1/auth0')
      .flush({ detail: 'Account already linked' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(dialog.form.controls.subject.value).toBe('auth0|draft');
    expect(dialog.actionError()).toBe('Account already linked');
    expect(dialog.canSave).toBe(true);
    expect(fixture.componentInstance.auth0Subject()).toBeNull();
    expect(TestBed.inject(MatDialog).openDialogs[0].disableClose).toBe(false);
  });

  it('cancels an in-flight account link when leaving the page', async () => {
    const fixture = await create();
    fixture.componentInstance.openLink();
    const dialog = linkDialog();
    dialog.form.controls.subject.setValue('auth0|old');
    dialog.form.markAsDirty();
    dialog.save();
    const request = http.expectOne('/api/identity/users/u1/auth0');
    fixture.destroy();
    await vi.waitFor(() => expect(request.cancelled).toBe(true));
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0);
  });

  it('removes exactly the confirmed assignment and preserves it on cancellation', async () => {
    const fixture = await create([assignment]);
    const component = fixture.componentInstance;
    component.revoke(assignment);
    http.expectNone(request => request.method === 'DELETE');
    TestBed.inject(MatDialog).openDialogs[0].close(false);
    await fixture.whenStable();
    expect(component.assignments()).toEqual([assignment]);
    component.revoke(assignment);
    TestBed.inject(MatDialog).openDialogs[0].close(true);
    await vi.waitFor(() => expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0));
    const request = http.expectOne('/api/identity/users/u1/role-assignments/a1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    expect(component.assignments()).toEqual([]);
    http.expectNone(pending => pending.method === 'GET');
  });
});
