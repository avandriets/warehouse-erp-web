import type { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { WarehouseAuthService } from '@warehouse/auth';

import { routes } from '../../app.routes';

describe('warehouse app layout', () => {
  let harness: RouterTestingHarness;
  let loader: HarnessLoader;
  const auth = {
    loading: signal(false),
    authenticated: signal(false),
    user: signal(null),
    login: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(async () => {
    auth.login.mockClear();
    auth.logout.mockClear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: WarehouseAuthService, useValue: auth }],
    });
    harness = await RouterTestingHarness.create('/');
    loader = TestbedHarnessEnvironment.loader(harness.fixture);
  });

  it('shows unauthenticated users a toolbar and welcome page without a sidebar', async () => {
    const root = harness.fixture.nativeElement as HTMLElement;

    expect(root.querySelector('mat-toolbar')).not.toBeNull();
    expect(root.querySelector('mat-sidenav')).toBeNull();
    expect(root.querySelector('h1')?.textContent).toContain('Welcome to warehouse management');

    const signIn = await loader.getHarness(MatButtonHarness.with({ text: 'Sign in' }));
    await signIn.click();

    expect(auth.login).toHaveBeenCalledWith('/');
  });
});
