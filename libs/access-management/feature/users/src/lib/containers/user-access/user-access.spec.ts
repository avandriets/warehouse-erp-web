import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideAccessManagement } from '@warehouse/access-management';
import type { UserRecord } from '@warehouse/access-management/util';

import { UserAccessEditor } from '../../components';
import { UserAccessPage } from './user-access';

const user: UserRecord = {
  id: 'u1',
  auth0_subject: null,
  email: 'alex@example.com',
  display_name: 'Alex',
  status: 'ACTIVE',
  created_at: '',
  updated_at: '',
};

describe('user access page', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UserAccessPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAccessManagement({ apiUrl: '/api' }),
        provideRouter([{ path: 'users/:userId/access', component: UserAccessPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the user from a direct URL before rendering access management', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/users/u1/access', UserAccessPage);
    http.expectOne('/api/identity/users/u1').flush(user);
    await harness.fixture.whenStable();
    http.expectOne('/api/identity/roles').flush([
      {
        id: 'r1',
        code: 'MANAGER',
        name: 'Manager',
        active: true,
        system_role: false,
        description: null,
        created_at: '',
        updated_at: '',
      },
    ]);
    http.expectOne('/api/identity/users/u1/role-assignments').flush([]);
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('Alex');
    expect(harness.routeNativeElement?.textContent).toContain('Assigned roles');
    expect(harness.routeNativeElement?.querySelector('[pageBreadcrumb]')?.textContent).toContain('Users');
    expect(harness.routeNativeElement?.querySelector('[pageActions] button[form="user-link-form"]')).not.toBeNull();
    expect(
      harness.routeNativeElement?.querySelector('[pageActions] button[form="role-assignment-form"]'),
    ).not.toBeNull();

    const editor = harness.routeDebugElement?.query(By.directive(UserAccessEditor))
      .componentInstance as UserAccessEditor;
    editor.assignmentForm.controls.roleId.setValue('r1');
    editor.assignmentForm.markAsDirty();
    await harness.fixture.whenStable();
    const assign = harness.routeNativeElement?.querySelector<HTMLButtonElement>(
      '[pageActions] button[form="role-assignment-form"]',
    );
    expect(assign?.disabled).toBe(false);
    assign?.click();
    const request = http.expectOne('/api/identity/users/u1/role-assignments');
    expect(request.request.body).toEqual({ role_id: 'r1', scope_type: 'GLOBAL', scope_id: null });
    request.flush({ id: 'a1' });
  });
});
