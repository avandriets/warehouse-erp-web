import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AUTH_CONFIG, WarehouseAuthService } from '@warehouse/auth';
import { of } from 'rxjs';

import { createAppRoutes } from './app.routes';
import { LIBRARY_MOUNTS } from './config/library-mounts.config';
import { MENU_CONFIG } from './config/menu.config';

function configure(permissions: string[]): void {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AUTH_CONFIG, useValue: { apiUrl: '/api' } },
      {
        provide: WarehouseAuthService,
        useValue: {
          authenticated: signal(true),
          loading: signal(false),
          error: signal(null),
          user: signal(null),
          ensureCurrentUser: () => of({ status: 'ACTIVE', permissions }),
          can: (permission: string): boolean => permissions.includes(permission),
        },
      },
      provideRouter(createAppRoutes(MENU_CONFIG, LIBRARY_MOUNTS)),
    ],
  });
}

describe('settings access', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it.each([{ permissions: [] }, { permissions: ['users.manage'] }, { permissions: ['settings.read'] }])(
    'denies direct settings access without management permission: %j',
    async ({ permissions }) => {
      configure(permissions);
      const harness = await RouterTestingHarness.create('/administration/settings');
      expect(harness.routeNativeElement?.textContent).toContain('required permissions');
      TestBed.inject(HttpTestingController).expectNone(request => request.url.startsWith('/api/settings'));
    },
  );

  it('hides the settings menu from a user administrator without settings permission', async () => {
    configure(['users.manage']);
    const harness = await RouterTestingHarness.create('/administration');
    const root = harness.routeNativeElement!;
    expect(root.textContent).toContain('Users');
    expect(root.querySelector('a[href="/administration/settings"]')).toBeNull();
  });

  it('shows settings to a settings administrator without granting user management', async () => {
    configure(['settings.manage', 'settings.read']);
    const harness = await RouterTestingHarness.create('/administration');
    const root = harness.routeNativeElement!;
    expect(root.querySelector('a[href="/administration/settings"]')).not.toBeNull();
    expect(root.querySelector('a[href="/administration/users"]')).toBeNull();
    await harness.navigateByUrl('/administration/users');
    expect(harness.routeNativeElement?.textContent).toContain('required permissions');
  });
});
