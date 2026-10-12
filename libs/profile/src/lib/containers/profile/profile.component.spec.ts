import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@auth0/auth0-angular';
import type { CurrentUser } from '@warehouse/auth';
import { AUTH_CONFIG, WarehouseAuthService } from '@warehouse/auth';
import { of } from 'rxjs';

import { ProfileComponent } from './profile.component';

const user: CurrentUser = {
  user_id: 'own-user',
  subject: 'auth0|own-user',
  status: 'ACTIVE',
  permissions: ['settings.manage'],
  first_name: 'Ada',
  last_name: 'Lovelace',
  display_name: 'Ada L',
  email: 'ada@example.test',
};

describe('own profile', () => {
  let http: HttpTestingController;
  const snackBar = { open: vi.fn() };
  beforeEach(() => {
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: MatSnackBar, useValue: snackBar },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_CONFIG, useValue: { apiUrl: '/api' } },
        {
          provide: AuthService,
          useValue: { isLoading$: of(false), isAuthenticated$: of(true), error$: of(null), user$: of(null) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses own-user endpoints and preserves session identity and permissions after a UserResponse', () => {
    const page = TestBed.createComponent(ProfileComponent).componentInstance;
    http.expectOne('/api/identity/me').flush(user);
    page.form.patchValue({ first_name: 'Grace', email: '' });
    page.save();
    const request = http.expectOne('/api/identity/me');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ first_name: 'Grace', email: null });
    request.flush({
      id: 'own-user',
      auth0_subject: 'auth0|own-user',
      first_name: 'Grace',
      last_name: 'Lovelace',
      display_name: 'Grace Lovelace',
      email: null,
      status: 'ACTIVE',
    });
    const auth = TestBed.inject(WarehouseAuthService);
    expect(auth.currentUser?.user_id).toBe('own-user');
    expect(auth.currentUser?.permissions).toEqual(['settings.manage']);
    expect(auth.currentUser?.first_name).toBe('Grace');
    expect(page.form.pristine).toBe(true);
    expect(page.form.enabled).toBe(true);
  });

  it('validates email locally and preserves values on a rejected write', () => {
    const page = TestBed.createComponent(ProfileComponent).componentInstance;
    http.expectOne('/api/identity/me').flush(user);
    page.form.patchValue({ email: 'bad email' });
    page.save();
    http.expectNone('/api/identity/me');
    page.form.patchValue({ email: 'used@example.test' });
    page.save();
    http
      .expectOne('/api/identity/me')
      .flush({ detail: 'User with this email already exists' }, { status: 409, statusText: 'Conflict' });
    expect(page.form.controls.email.value).toBe('used@example.test');
    expect(page.actionError()).toContain('already exists');
    expect(snackBar.open).not.toHaveBeenCalled();
    expect(TestBed.inject(WarehouseAuthService).currentUser?.email).toBe(user.email);
  });
  it('serializes reload and save and exposes their progress through one state', () => {
    const page = TestBed.createComponent(ProfileComponent).componentInstance;
    expect(page.state()).toMatchObject({ pending: true, resolved: false });
    page.load();
    page.save();
    http.expectOne('/api/identity/me').flush(user);
    page.form.patchValue({ first_name: 'Grace' });
    page.save();
    expect(page.state()).toMatchObject({ pending: true, resolved: true, saving: true });
    page.load();
    page.save();
    http.expectOne('/api/identity/me').flush({
      ...user,
      id: user.user_id,
      first_name: 'Grace',
    });
    expect(page.state()).toMatchObject({ pending: false, resolved: true, saving: false });
    expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('Profile saved.', 'Dismiss', { duration: 4000 });
  });

  it('skips writes when normalized fields are unchanged', () => {
    const page = TestBed.createComponent(ProfileComponent).componentInstance;
    http.expectOne('/api/identity/me').flush(user);
    page.form.patchValue({ first_name: ' Ada ' });
    page.save();
    http.expectNone('/api/identity/me');
    expect(page.state().pending).toBe(false);
    expect(page.form.enabled).toBe(true);
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('renders a failed load in the state container and retries through its action', () => {
    const fixture = TestBed.createComponent(ProfileComponent);
    http
      .expectOne('/api/identity/me')
      .flush({ detail: 'Service unavailable' }, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('ui-state-container') as HTMLElement;
    expect(container.textContent).toContain('Service unavailable');
    container.querySelector('button')?.click();
    http.expectOne('/api/identity/me').flush(user);
    fixture.detectChanges();
    expect(fixture.componentInstance.state()).toMatchObject({ resolved: true, rejected: false, pending: false });
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });

  it('does not notify when a pending save is cancelled by page destruction', () => {
    const fixture = TestBed.createComponent(ProfileComponent);
    http.expectOne('/api/identity/me').flush(user);
    fixture.componentInstance.form.patchValue({ first_name: 'Grace' });
    fixture.componentInstance.save();
    const request = http.expectOne('/api/identity/me');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('cancels pending work when the page is destroyed', () => {
    const fixture = TestBed.createComponent(ProfileComponent);
    const request = http.expectOne('/api/identity/me');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });
});
