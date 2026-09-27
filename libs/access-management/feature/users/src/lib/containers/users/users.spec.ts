import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideAccessManagement } from '@warehouse/access-management';

import { UsersPage } from './users';

describe('users page', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAccessManagement({ apiUrl: '/api' })],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function create(): ComponentFixture<UsersPage> {
    const fixture = TestBed.createComponent(UsersPage);
    fixture.detectChanges();
    http.expectOne('/api/identity/users?limit=25&offset=0').flush([]);

    return fixture;
  }

  it('creates users with the backend contract and refreshes the list', async () => {
    const component = create().componentInstance;
    component.open();
    component.model = { email: ' new@example.com ', display_name: ' New User ' };
    const result = component.save();
    const request = http.expectOne('/api/identity/users');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'new@example.com', display_name: 'New User' });
    request.flush({ id: 'u1' });
    await Promise.resolve();
    http.expectOne('/api/identity/users?limit=25&offset=0').flush([]);
    await result;
    expect(component.editor()).toBe(false);
  });

  it('preserves form values after a rejected write', async () => {
    const component = create().componentInstance;
    component.open();
    component.model = { email: 'duplicate@example.com', display_name: '' };
    const result = component.save();
    http
      .expectOne('/api/identity/users')
      .flush({ detail: 'Email already exists' }, { status: 409, statusText: 'Conflict' });
    await result;
    expect(component.editor()).toBe(true);
    expect(component.model.email).toBe('duplicate@example.com');
    expect(component.error()).toBe('Email already exists');
  });

  it('resets pagination when filtering by status', () => {
    const component = create().componentInstance;
    component.offset = 25;
    component.filter = 'SUSPENDED';
    component.changeFilter();
    http.expectOne('/api/identity/users?limit=25&offset=0&status=SUSPENDED').flush([]);
    expect(component.offset).toBe(0);
  });
});
