import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideAccessManagement } from '@warehouse/access-management';
import type { RoleRecord } from '@warehouse/access-management/util';

import { RolePermissionsEditor } from '../../components';
import { RolePermissionsPage } from './role-permissions';

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

describe('role permissions page', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RolePermissionsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAccessManagement({ apiUrl: '/api' }),
        provideRouter([{ path: 'roles/:roleId/permissions', component: RolePermissionsPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the role from a direct URL before rendering permissions', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/roles/r1/permissions', RolePermissionsPage);
    http.expectOne('/api/identity/roles/r1').flush(role);
    await harness.fixture.whenStable();
    http.expectOne('/api/identity/permissions').flush([{ id: 'p1', code: 'users.manage' }]);
    http.expectOne('/api/identity/roles/r1/permissions').flush([]);
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('Manager');
    expect(harness.routeNativeElement?.textContent).toContain('Role permissions');
    const save = harness.routeNativeElement?.querySelector<HTMLButtonElement>(
      '[pageActions] button[form="role-permissions-form"]',
    );
    expect(save?.disabled).toBe(true);

    const editor = harness.routeDebugElement?.query(By.directive(RolePermissionsEditor))
      .componentInstance as RolePermissionsEditor;
    editor.form.patchValue({ 'users.manage': true });
    editor.form.markAsDirty();
    await harness.fixture.whenStable();
    expect(save?.disabled).toBe(false);
    save?.click();
    const request = http.expectOne('/api/identity/roles/r1/permissions');
    expect(request.request.body).toEqual({ permission_codes: ['users.manage'] });
    request.flush([{ id: 'p1', code: 'users.manage' }]);
  });
});
