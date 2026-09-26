import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAccessManagement } from '@warehouse/access-management';
import type { RoleRecord } from '@warehouse/access-management/util';

import { RolesPage } from '.';

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RolesPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAccessManagement({ apiUrl: '/api' })],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('never submits immutable role codes when editing', async () => {
    const fixture = TestBed.createComponent(RolesPage);
    fixture.detectChanges();
    http.expectOne('/api/identity/roles').flush([role]);
    const component = fixture.componentInstance;
    component.open(role);
    component.model.code = 'CHANGED';
    component.model.description = '';
    component.model.active = false;
    const result = component.save();
    const request = http.expectOne('/api/identity/roles/r1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'Manager', description: null, active: false });
    request.flush({ ...role, active: false });
    await Promise.resolve();
    http.expectOne('/api/identity/roles').flush([]);
    await result;
  });
});
