import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideAccessManagement } from '@warehouse/access-management';
import type { RoleRecord } from '@warehouse/access-management/util';
import { UrlSearch } from '@warehouse/shared';

import type { RoleFormDialog } from '../../components';
import { RolesFilter } from '../../components';
import { RolesPage } from './roles';

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

describe('roles page', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  function editor(): RoleFormDialog {
    return TestBed.inject(MatDialog).openDialogs[0].componentInstance as RoleFormDialog;
  }

  function filterControl(): RolesFilter {
    return harness.routeDebugElement!.query(By.directive(RolesFilter)).componentInstance;
  }

  function search(): UrlSearch {
    return harness.routeDebugElement!.query(By.directive(UrlSearch)).componentInstance;
  }

  async function changeFilter(value: string): Promise<void> {
    filterControl().control.setValue(value);
    await harness.fixture.whenStable();
  }

  async function changeQuery(value: string): Promise<void> {
    search().control.setValue(value);
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain(`q=${value}`));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RolesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAccessManagement({ apiUrl: '/api' }),
        provideRouter([{ path: 'roles', component: RolesPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('never submits immutable role codes when editing', async () => {
    harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/roles', RolesPage);
    http.expectOne('/api/identity/roles').flush([role]);
    component.open(role);
    editor().form.controls.code.setValue('CHANGED');
    editor().form.controls.description.setValue('');
    editor().form.controls.active.setValue(false);
    editor().save();
    const request = http.expectOne('/api/identity/roles/r1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'Manager', description: null, active: false });
    request.flush({ ...role, active: false });
    await vi.waitFor(() => http.expectOne('/api/identity/roles').flush([]));
  });
  it('restores boolean filters from the URL and removes them for all roles', async () => {
    harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/roles?active=false&q=manager', RolesPage);
    http.expectOne('/api/identity/roles?active=false').flush([role]);
    expect(filterControl().control.value).toBe('false');
    expect(component.query()).toBe('manager');
    await changeFilter('true');
    http.expectOne('/api/identity/roles?active=true').flush([]);
    expect(TestBed.inject(Router).url).toContain('active=true');
    await changeFilter('');
    http.expectOne('/api/identity/roles').flush([]);
    expect(TestBed.inject(Router).url).toBe('/roles?q=manager');
    await changeQuery('admin');
    http.expectNone(request => request.url === '/api/identity/roles');
    expect(TestBed.inject(Router).url).toBe('/roles?q=admin');
  });
  it('creates a role once and refreshes the filtered list after saving', async () => {
    harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/roles?active=true', RolesPage);
    http.expectOne('/api/identity/roles?active=true').flush([]);
    component.open();
    editor().form.setValue({ code: 'MANAGER', name: ' Manager ', description: ' ', active: true });
    editor().save();
    const loader = TestbedHarnessEnvironment.documentRootLoader(harness.fixture);
    const save = await loader.getHarness(MatButtonHarness.with({ text: 'Saving…' }));
    expect(await save.isDisabled()).toBe(true);
    await save.click();
    const request = http.expectOne('/api/identity/roles');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: 'MANAGER', name: 'Manager', description: null });
    request.flush(role);
    await vi.waitFor(() => {
      const refresh = http.expectOne('/api/identity/roles?active=true');
      expect(component.loading()).toBe(true);
      refresh.flush([role]);
    });
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0);
    expect(component.saving()).toBe(false);
  });

  it('keeps the role draft after a failed create and allows retry', async () => {
    harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/roles', RolesPage);
    http.expectOne('/api/identity/roles').flush([]);
    component.open();
    editor().form.setValue({ code: 'MANAGER', name: 'Manager', description: 'Draft', active: true });
    editor().save();
    http
      .expectOne('/api/identity/roles')
      .flush({ detail: 'Code already exists' }, { status: 409, statusText: 'Conflict' });
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(1);
    expect(editor().form.controls.description.value).toBe('Draft');
    expect(editor().store.actionError()).toBe('Code already exists');
    expect(editor().store.saving()).toBe(false);
    http.expectNone('/api/identity/roles');
    editor().form.controls.code.setValue('MANAGER_NEW');
    editor().save();
    http.expectOne('/api/identity/roles').flush({ ...role, code: 'MANAGER_NEW' });
    await vi.waitFor(() => http.expectOne('/api/identity/roles').flush([]));
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0);
    expect(component.error()).toBe('');
  });
  it('deactivates a role only after confirmation and refreshes the URL selection', async () => {
    harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/roles?active=true', RolesPage);
    http.expectOne('/api/identity/roles?active=true').flush([role]);
    component.deactivate(role);
    http.expectNone('/api/identity/roles/r1');
    TestBed.inject(MatDialog).openDialogs[0].close(false);
    await vi.waitFor(() => expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0));
    http.expectNone('/api/identity/roles/r1');
    component.deactivate(role);
    TestBed.inject(MatDialog).openDialogs[0].close(true);
    await vi.waitFor(() => expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0));
    const request = http.expectOne('/api/identity/roles/r1');
    expect(request.request.body).toEqual({ name: role.name, description: role.description, active: false });
    request.flush({ ...role, active: false });
    http.expectOne('/api/identity/roles?active=true').flush([]);
    expect(component.saving()).toBe(false);
  });
});
