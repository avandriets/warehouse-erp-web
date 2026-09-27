import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { provideAccessManagement } from '@warehouse/access-management';
import type { RoleRecord } from '@warehouse/access-management/util';

import { RolePermissions } from './role-permissions';

const role: RoleRecord = {
  id: 'r1',
  code: 'MANAGER',
  name: 'Manager',
  description: null,
  active: true,
  system_role: false,
  created_at: '',
  updated_at: '',
};

describe('role permissions', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RolePermissions],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAccessManagement({ apiUrl: '/api' })],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('replaces permissions using only selected codes', async () => {
    const fixture = TestBed.createComponent(RolePermissions);
    fixture.componentRef.setInput('role', role);
    fixture.detectChanges();
    http.expectOne('/api/identity/permissions').flush([
      { id: 'p1', code: 'users.manage', description: 'Manage users' },
      { id: 'p2', code: 'catalog.read', description: 'Read catalog' },
    ]);
    http.expectOne('/api/identity/roles/r1/permissions').flush([]);
    const component = fixture.componentInstance;
    component.form.patchValue({ 'users.manage': true, 'catalog.read': false });
    component.save();
    const request = http.expectOne('/api/identity/roles/r1/permissions');
    expect(request.request.body).toEqual({ permission_codes: ['users.manage'] });
    request.flush([]);
    await vi.waitFor(() => http.expectOne('/api/identity/permissions').flush([]));
    http.expectOne('/api/identity/roles/r1/permissions').flush([]);
  });

  it('keeps the editor disabled if assigned permissions fail to load', async () => {
    const fixture = TestBed.createComponent(RolePermissions);
    fixture.componentRef.setInput('role', role);
    fixture.detectChanges();
    http
      .expectOne('/api/identity/permissions')
      .flush([{ id: 'p1', code: 'users.manage', description: 'Manage users' }]);
    http.expectOne('/api/identity/roles/r1/permissions').flush({}, { status: 403, statusText: 'Forbidden' });
    await vi.waitFor(() => {
      expect(fixture.componentInstance.ready()).toBe(false);
      expect(fixture.componentInstance.error()).toContain('You do not have permission');
    });
  });
  it('keeps draft selection on a failed write and prevents duplicate writes', async () => {
    const fixture = TestBed.createComponent(RolePermissions);
    fixture.componentRef.setInput('role', role);
    await vi.waitFor(() => {
      http.expectOne('/api/identity/permissions').flush([{ id: 'p1', code: 'users.manage' }]);
      http.expectOne('/api/identity/roles/r1/permissions').flush([]);
    });
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.form.patchValue({ 'users.manage': true });
    component.save();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const save = await loader.getHarness(MatButtonHarness.with({ text: 'Save permissions' }));
    expect(await save.isDisabled()).toBe(true);
    await save.click();
    http
      .expectOne('/api/identity/roles/r1/permissions')
      .flush({ detail: 'Write denied' }, { status: 409, statusText: 'Conflict' });
    expect(component.form.getRawValue()).toEqual({ 'users.manage': true });
    expect(component.error()).toBe('Write denied');
    expect(component.busy()).toBe(false);
    http.expectNone(request => request.method === 'GET');
  });

  it('ignores completion of an old write after switching roles', async () => {
    const fixture = TestBed.createComponent(RolePermissions);
    fixture.componentRef.setInput('role', role);
    await vi.waitFor(() => {
      http.expectOne('/api/identity/permissions').flush([]);
      http.expectOne('/api/identity/roles/r1/permissions').flush([]);
    });
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.save();
    const old = http.expectOne('/api/identity/roles/r1/permissions');
    fixture.componentRef.setInput('role', { ...role, id: 'r2' });
    await vi.waitFor(() => {
      http.expectOne('/api/identity/permissions').flush([{ id: 'p2', code: 'catalog.read' }]);
      http.expectOne('/api/identity/roles/r2/permissions').flush([{ id: 'p2', code: 'catalog.read' }]);
    });
    await fixture.whenStable();
    expect(old.cancelled).toBe(true);
    expect(component.form.getRawValue()).toEqual({ 'catalog.read': true });
    expect(component.busy()).toBe(false);
    http.expectNone(request => request.method === 'GET');
  });
  it('cancels the refresh after a successful write when switching roles', () => {
    const fixture = TestBed.createComponent(RolePermissions);
    fixture.componentRef.setInput('role', role);
    fixture.detectChanges();
    http.expectOne('/api/identity/permissions').flush([]);
    http.expectOne('/api/identity/roles/r1/permissions').flush([]);
    const component = fixture.componentInstance;
    component.save();
    http.expectOne('/api/identity/roles/r1/permissions').flush([]);
    const oldCatalog = http.expectOne('/api/identity/permissions');
    const oldAssigned = http.expectOne('/api/identity/roles/r1/permissions');
    expect(component.busy()).toBe(true);

    fixture.componentRef.setInput('role', { ...role, id: 'r2' });
    fixture.detectChanges();
    expect(oldCatalog.cancelled).toBe(true);
    expect(oldAssigned.cancelled).toBe(true);
    http.expectOne('/api/identity/permissions').flush([{ id: 'p2', code: 'catalog.read' }]);
    http.expectOne('/api/identity/roles/r2/permissions').flush([{ id: 'p2', code: 'catalog.read' }]);
    expect(component.form.getRawValue()).toEqual({ 'catalog.read': true });
    expect(component.busy()).toBe(false);
  });
  it('disables submission during refresh and unlocks after a failed refresh', async () => {
    const fixture = TestBed.createComponent(RolePermissions);
    fixture.componentRef.setInput('role', role);
    fixture.detectChanges();
    http.expectOne('/api/identity/permissions').flush([]);
    http.expectOne('/api/identity/roles/r1/permissions').flush([]);
    const component = fixture.componentInstance;
    component.save();
    http.expectOne('/api/identity/roles/r1/permissions').flush([]);
    expect(component.store.saving()).toBe(false);
    expect(component.store.loading()).toBe(true);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const save = await loader.getHarness(MatButtonHarness.with({ text: 'Save permissions' }));
    expect(await save.isDisabled()).toBe(true);
    await save.click();
    http.expectNone(request => request.method === 'PUT');
    http.expectOne('/api/identity/permissions').flush([]);
    http.expectOne('/api/identity/roles/r1/permissions').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(component.busy()).toBe(false);
    expect(component.store.error()).toBeTruthy();
  });
});
