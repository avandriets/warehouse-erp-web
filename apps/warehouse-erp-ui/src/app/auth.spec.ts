import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { CurrentUser } from '@warehouse/auth';
import { WarehouseAuthService } from '@warehouse/auth';
import { of, throwError } from 'rxjs';

import { createAppRoutes } from './app.routes';
import { LIBRARY_MOUNTS } from './config/library-mounts.config';
import { MENU_CONFIG } from './config/menu.config';

const activeUser: CurrentUser = {
  first_name: null,
  last_name: null,
  display_name: null,
  email: null,
  user_id: 'test-user',
  subject: 'auth0|test-user',
  status: 'ACTIVE',
  permissions: [],
};

describe('shell authentication', () => {
  const auth = {
    loading: signal(false),
    authenticated: signal(false),
    error: signal<Error | null>(null),
    user: signal({ name: 'Test User' }),
    ensureCurrentUser: vi.fn(() => of(activeUser)),
    can: vi.fn(() => true),
    login: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(() => {
    auth.can.mockReturnValue(true);
    auth.loading.set(false);
    auth.authenticated.set(false);
    auth.error.set(null);
    auth.ensureCurrentUser.mockReset().mockReturnValue(of(activeUser));
    auth.login.mockClear();
    auth.logout.mockClear();
  });

  async function open(url = '/'): Promise<RouterTestingHarness> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(createAppRoutes(MENU_CONFIG, LIBRARY_MOUNTS)),
        provideLocationMocks(),
        { provide: WarehouseAuthService, useValue: auth },
      ],
    });

    return RouterTestingHarness.create(url);
  }

  it('shows only a sign-in invitation before entering the shell', async () => {
    const harness = await open();
    expect(harness.routeNativeElement?.textContent).toContain('Sign in to continue');
    expect(harness.routeNativeElement?.querySelector('erp-layout')).toBeNull();
    expect(auth.ensureCurrentUser).not.toHaveBeenCalled();
    expect(harness.routeNativeElement?.textContent).not.toContain('Return to welcome');
  });

  it('protects deep links and preserves the login target', async () => {
    const target = '/master-data/products/123/edit?view=details#form';
    const harness = await open();
    await harness.navigateByUrl(target);
    expect(harness.routeNativeElement?.textContent).toContain('Sign in to continue');
    expect(harness.routeNativeElement?.textContent).not.toContain('Edit product');
    const router = TestBed.inject(Router);
    expect(router.parseUrl(router.url).queryParams['returnTo']).toBe(target);
    const button = [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button')].find(
      item => item.textContent?.trim() === 'Sign in',
    )!;
    button.click();
    expect(auth.login).toHaveBeenCalledWith(target);

    auth.authenticated.set(true);
    await harness.navigateByUrl(target);
    expect(harness.routeNativeElement?.querySelector('erp-primary-menu')).not.toBeNull();
    expect(auth.ensureCurrentUser).toHaveBeenCalled();
    harness
      .routeNativeElement!.querySelector<HTMLButtonElement>('button[aria-label="Account menu for Test User"]')!
      .click();
    await harness.fixture.whenStable();
    document.querySelector<HTMLButtonElement>('[role="menuitem"]')!.click();
    expect(auth.logout).toHaveBeenCalled();
  });

  it('waits for session restoration before entering the shell', async () => {
    auth.loading.set(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(createAppRoutes(MENU_CONFIG, LIBRARY_MOUNTS)),
        { provide: WarehouseAuthService, useValue: auth },
      ],
    });
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/');
    TestBed.tick();
    expect(harness.routeNativeElement?.querySelector('erp-primary-menu') ?? null).toBeNull();
    expect(auth.ensureCurrentUser).not.toHaveBeenCalled();
    auth.authenticated.set(true);
    auth.loading.set(false);
    TestBed.tick();
    await navigation;
    expect(harness.routeNativeElement?.textContent).toContain('Welcome to Warehouse ERP');
  });

  it('does not open the shell for an inactive ERP profile', async () => {
    auth.authenticated.set(true);
    auth.ensureCurrentUser.mockReturnValue(of({ ...activeUser, status: 'SUSPENDED' }));
    const harness = await open();
    expect(harness.routeNativeElement?.textContent).toContain('Access unavailable');
    expect(harness.routeNativeElement?.querySelector('erp-layout')).toBeNull();
  });

  it('shows an ERP failure instead of entering the shell', async () => {
    auth.authenticated.set(true);
    auth.ensureCurrentUser.mockReturnValue(throwError(() => new Error('Unavailable')));
    const harness = await open();
    expect(harness.routeNativeElement?.textContent).toContain('The ERP service is temporarily unavailable');
    expect(harness.routeNativeElement?.querySelector('erp-layout')).toBeNull();
  });

  it('rejects an external return URL', async () => {
    const harness = await open('/error?status=401&returnTo=%2F%2Fexample.com');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('button')!.click();
    expect(auth.login).toHaveBeenCalledWith('/');
  });

  it('keeps the browser URL when a protected navigation is denied', async () => {
    const harness = await open();
    const location = TestBed.inject(Location);
    location.go('/master-data/warehouses');
    await harness.navigateByUrl('/master-data/warehouses');
    expect(location.path()).toBe('/master-data/warehouses');
    expect(harness.routeNativeElement?.textContent).toContain('Sign in to continue');
  });
  it('hides administration and blocks its deep links without users.manage', async () => {
    auth.authenticated.set(true);
    auth.can.mockReturnValue(false);
    const harness = await open();
    expect(harness.routeNativeElement?.querySelector('a[href="/administration"]')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('button[aria-label="Administration"]')).toBeNull();
    for (const path of [
      '/administration',
      '/administration/users',
      '/administration/roles/test/permissions',
      '/users/test/access',
    ]) {
      await harness.navigateByUrl(path);
      expect(harness.routeNativeElement?.textContent).toContain('Access unavailable');
    }
    expect(auth.can).toHaveBeenCalledWith('users.manage');
  });

  it('shows administration cards for an authorized user', async () => {
    auth.authenticated.set(true);
    const harness = await open('/administration');
    expect(harness.routeNativeElement?.querySelector('a[href="/administration/users"]')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('a[href="/administration/roles"]')).not.toBeNull();
  });
});
