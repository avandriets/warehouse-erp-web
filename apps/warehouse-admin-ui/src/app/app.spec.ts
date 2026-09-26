import { BreakpointObserver } from '@angular/cdk/layout';
import type { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { provideRouter } from '@angular/router';
import { WarehouseAuth } from '@warehouse/auth';
import { of } from 'rxjs';

import { App } from './app';

describe('admin shell', () => {
  let fixture: ComponentFixture<App>;
  let loader: HarnessLoader;
  const auth = {
    isLoading$: of(false),
    isAuthenticated$: of(false),
    user$: of(null),
    can: vi.fn(() => true),
    login: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(() => {
    auth.login.mockClear();
    auth.logout.mockClear();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: WarehouseAuth, useValue: auth },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: false, breakpoints: {} }) },
        },
      ],
    });
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('starts login from the top taskbar', async () => {
    const signIn = await loader.getHarness(MatButtonHarness.with({ text: 'Sign in' }));

    await signIn.click();

    expect(auth.login).toHaveBeenCalledWith('/');
  });
});
