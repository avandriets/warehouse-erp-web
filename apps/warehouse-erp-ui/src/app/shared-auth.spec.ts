import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideRouter, RedirectCommand, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import type { CurrentUser } from '@warehouse/auth';
import { AUTH_CONFIG, permissionGuard, WarehouseAuthService } from '@warehouse/auth';
import { apiError } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { firstValueFrom, of } from 'rxjs';
const user: CurrentUser = {
  first_name: null,
  last_name: null,
  display_name: null,
  email: null,
  user_id: 'user-1',
  subject: 'auth0|1',
  status: 'ACTIVE',
  permissions: ['users.manage'],
};
describe('shared authentication and permissions', () => {
  let http: HttpTestingController;
  let sdk: {
    isLoading$: Observable<boolean>;
    isAuthenticated$: Observable<boolean>;
    user$: Observable<null>;
    error$: Observable<null>;
    loginWithRedirect: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    sdk = {
      isLoading$: of(false),
      isAuthenticated$: of(true),
      user$: of(null),
      error$: of(null),
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_CONFIG, useValue: { apiUrl: '/api' } },
        { provide: AuthService, useValue: sdk },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function guard(): Promise<boolean | UrlTree | RedirectCommand> {
    return firstValueFrom(
      TestBed.runInInjectionContext(() =>
        permissionGuard(
          { data: { permission: 'users.manage' } } as unknown as ActivatedRouteSnapshot,
          { url: '/users' } as RouterStateSnapshot,
        ),
      ) as Observable<boolean | UrlTree | RedirectCommand>,
    );
  }

  function expectErrorRedirect(result: boolean | UrlTree | RedirectCommand, status: 401 | 403 | 503): void {
    expect(result).toBeInstanceOf(RedirectCommand);
    const redirect = result as RedirectCommand;

    expect(TestBed.inject(Router).serializeUrl(redirect.redirectTo)).toBe(`/error?status=${status}&returnTo=%2Fusers`);
    expect(redirect.navigationBehaviorOptions).toEqual({ skipLocationChange: true });
  }

  it('redirects unauthenticated visitors to the access explanation without requesting ERP data', async () => {
    sdk.isAuthenticated$ = of(false);
    expectErrorRedirect(await guard(), 401);
    http.expectNone('/api/identity/me');
  });
  it('allows an active manager based on ERP permissions', async () => {
    const result = guard();
    http.expectOne('/api/identity/me').flush(user);
    expect(await result).toBe(true);
    expect(TestBed.inject(WarehouseAuthService).can('users.manage')).toBe(true);
  });
  it('reuses the current ERP identity and shares an in-flight request', async () => {
    const auth = TestBed.inject(WarehouseAuthService);
    const first = firstValueFrom(auth.ensureCurrentUser());
    const second = firstValueFrom(auth.ensureCurrentUser());
    const request = http.expectOne('/api/identity/me');

    request.flush(user);

    expect(await first).toEqual(user);
    expect(await second).toEqual(user);
    expect(await firstValueFrom(auth.ensureCurrentUser())).toEqual(user);
    http.expectNone('/api/identity/me');
  });
  it.each([
    { ...user, status: 'SUSPENDED' },
    { ...user, status: 'PENDING_APPROVAL' },
    { ...user, permissions: [] },
  ])('denies inactive or unprivileged users: %j', async value => {
    const result = guard();
    http.expectOne('/api/identity/me').flush(value);
    expectErrorRedirect(await result, 403);
  });
  it('fails closed when the ERP identity request fails', async () => {
    const auth = TestBed.inject(WarehouseAuthService);
    const result = guard();
    http.expectOne('/api/identity/me').flush({ detail: 'unavailable' }, { status: 503, statusText: 'Unavailable' });
    expectErrorRedirect(await result, 503);
    expect(auth.can('users.manage')).toBe(false);
  });
  it('preserves return route and clears identity on logout', () => {
    const auth = TestBed.inject(WarehouseAuthService);
    auth.login('/roles');
    expect(sdk.loginWithRedirect).toHaveBeenCalledWith({ appState: { target: '/roles' } });
    auth.currentUser = user;
    auth.logout();
    expect(auth.currentUser).toBeNull();
    expect(sdk.logout).toHaveBeenCalled();
  });
  it('formats FastAPI validation errors for the form', () => {
    expect(
      apiError(
        new HttpErrorResponse({
          status: 422,
          error: { detail: [{ loc: ['body', 'email'], msg: 'Invalid email' }] },
        }),
      ),
    ).toContain('body.email: Invalid email');
  });
});
