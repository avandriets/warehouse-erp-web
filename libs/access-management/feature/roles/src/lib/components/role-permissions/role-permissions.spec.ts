import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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
    component.selected = { 'users.manage': true, 'catalog.read': false };
    const result = component.save();
    const request = http.expectOne('/api/identity/roles/r1/permissions');
    expect(request.request.body).toEqual({ permission_codes: ['users.manage'] });
    request.flush([]);
    await Promise.resolve();
    http.expectOne('/api/identity/permissions').flush([]);
    http.expectOne('/api/identity/roles/r1/permissions').flush([]);
    await result;
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
});
