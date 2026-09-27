import { BreakpointObserver } from '@angular/cdk/layout';
import type { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatSidenavHarness } from '@angular/material/sidenav/testing';
import { provideRouter, Router } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';
import { BehaviorSubject } from 'rxjs';

import { AppLayout } from './app-layout';

describe('admin app layout', () => {
  let fixture: ComponentFixture<AppLayout>;
  let loader: HarnessLoader;
  const viewport = new BehaviorSubject({ matches: false, breakpoints: {} });
  const storageKey = 'warehouse-admin.sidebar-collapsed';
  const auth = {
    loading: signal(false),
    authenticated: signal(false),
    user: signal(null),
    can: vi.fn(() => true),
    login: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    viewport.next({ matches: false, breakpoints: {} });
    auth.can.mockReturnValue(true);
    auth.login.mockClear();
    auth.logout.mockClear();
    TestBed.configureTestingModule({
      imports: [AppLayout],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: WarehouseAuthService, useValue: auth },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => viewport },
        },
      ],
    });
    fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    localStorage.removeItem(storageKey);
  });

  it('collapses to accessible icon links and restores the saved preference', async () => {
    const collapse = await loader.getHarness(MatButtonHarness.with({ selector: '[aria-label="Collapse navigation"]' }));
    await collapse.click();

    expect(fixture.componentInstance.collapsed()).toBe(true);
    expect(localStorage.getItem(storageKey)).toBe('true');
    expect(
      fixture.nativeElement.querySelector('#app-navigation-drawer').style.getPropertyValue('--app-navigation-width'),
    ).toBe('4.5rem');
    expect(fixture.nativeElement.querySelectorAll('nav a svg')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('nav a').getAttribute('aria-label')).toBe('Users');

    const restored = TestBed.createComponent(AppLayout);
    restored.detectChanges();
    expect(restored.componentInstance.collapsed()).toBe(true);
    restored.destroy();

    const expand = await loader.getHarness(MatButtonHarness.with({ selector: '[aria-label="Expand navigation"]' }));
    await expand.click();
    expect(fixture.componentInstance.collapsed()).toBe(false);
    expect(localStorage.getItem(storageKey)).toBe('false');
  });

  it('uses a full overlay on mobile and keeps the desktop collapse preference', async () => {
    fixture.componentInstance.toggleNavigationCollapsed();
    viewport.next({ matches: true, breakpoints: {} });
    fixture.detectChanges();
    const sidenav = await loader.getHarness(MatSidenavHarness);
    expect(await sidenav.getMode()).toBe('over');
    expect(await sidenav.isOpen()).toBe(false);
    expect(fixture.componentInstance.collapsed()).toBe(false);

    const open = await loader.getHarness(MatButtonHarness.with({ selector: '[aria-label="Open navigation"]' }));
    await open.click();
    expect(await sidenav.isOpen()).toBe(true);
    // Selecting a section closes the overlay without changing the desktop preference.
    fixture.nativeElement.querySelector('nav a').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(await sidenav.isOpen()).toBe(false);

    viewport.next({ matches: false, breakpoints: {} });
    fixture.detectChanges();
    expect(await sidenav.getMode()).toBe('side');
    expect(await sidenav.isOpen()).toBe(true);
    expect(fixture.componentInstance.collapsed()).toBe(true);
  });

  it('expands and collapses the configured navigation group without navigating', async () => {
    const group = await loader.getHarness(MatButtonHarness.with({ text: /Access management/ }));
    const children = (): HTMLElement => fixture.nativeElement.querySelector('#navigation-access-management');
    expect(children().hidden).toBe(false);

    await group.click();
    expect(children().hidden).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/');

    await group.click();
    expect(children().hidden).toBe(false);
    expect(children().querySelectorAll('a')).toHaveLength(2);
  });

  it('starts login from the application header', async () => {
    const signIn = await loader.getHarness(MatButtonHarness.with({ text: 'Sign in' }));

    await signIn.click();

    expect(auth.login).toHaveBeenCalledWith('/');
  });

  it('renders access-management links without highlighting one at the application root', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    const links = (): HTMLAnchorElement[] => Array.from(fixture.nativeElement.querySelectorAll('nav a'));

    expect(links().map(link => link.getAttribute('href'))).toEqual(['/users', '/roles']);
    expect(links().every(link => link.classList.contains('mat-mdc-list-item-interactive'))).toBe(true);
    expect(links().every(link => getComputedStyle(link).cursor === 'pointer')).toBe(true);
    expect(
      links()
        .filter(link => link.classList.contains('app-navigation-active'))
        .map(link => link.getAttribute('href')),
    ).toEqual([]);

    await router.navigateByUrl('/users/123');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      links()
        .filter(link => link.classList.contains('app-navigation-active'))
        .map(link => link.getAttribute('href')),
    ).toEqual(['/users']);
  });

  it('filters every navigation entry by permission', () => {
    auth.can.mockReturnValue(false);
    const restrictedFixture = TestBed.createComponent(AppLayout);
    restrictedFixture.detectChanges();

    expect(restrictedFixture.nativeElement.querySelectorAll('nav a')).toHaveLength(0);
  });
});
