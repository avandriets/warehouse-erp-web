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
    const component = create().componentInstance;
    component.roleId = 'r1';
    component.scope = 'GLOBAL';
    component.scopeId = 'stale-id';
    const result = component.assign();
    const request = http.expectOne('/api/identity/users/u1/role-assignments');
    expect(request.request.body).toEqual({ role_id: 'r1', scope_type: 'GLOBAL', scope_id: null });
    request.flush({ id: 'a1' });
    await Promise.resolve();
    http.expectOne('/api/identity/roles').flush([]);
    http.expectOne('/api/identity/users/u1/role-assignments').flush([]);
    await result;
  });

  it('revokes exactly the selected assignment', async () => {
    const component = create().componentInstance;
    const result = component.revoke('a1');
    const request = http.expectOne('/api/identity/users/u1/role-assignments/a1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    await Promise.resolve();
    http.expectOne('/api/identity/roles').flush([]);
    http.expectOne('/api/identity/users/u1/role-assignments').flush([]);
    await result;
  });
});
