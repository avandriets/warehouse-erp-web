import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom } from 'rxjs';

import { createAppRoutes } from '../../app.routes';
import { PLACEHOLDER_PAGES } from '../../config/app-placeholders.config';
import { LIBRARY_MOUNTS } from '../../config/library-mounts.config';
import { MENU_CONFIG } from '../../config/menu.config';
import { provideTestAuth } from '../../testing/provide-test-auth';
import type { MenuConfig } from '../../types';

describe('warehouse navigation', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestAuth(),
        provideRouter(createAppRoutes(MENU_CONFIG, LIBRARY_MOUNTS, PLACEHOLDER_PAGES)),
        provideLocationMocks(),
      ],
    });
    router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
    harness = await RouterTestingHarness.create('/');
  });

  it('starts with a welcome screen and no selected category or sidebar', () => {
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('main h1')?.textContent).toContain('Welcome to Warehouse ERP');
    expect(root.querySelector('erp-submenu')).toBeNull();
    expect(root.querySelector('erp-welcome')).not.toBeNull();
    expect(root.querySelector('erp-submenu-overview')).toBeNull();
    expect(root.querySelectorAll('erp-primary-menu button[aria-current]')).toHaveLength(0);
    expect(root.querySelectorAll('main a')).toHaveLength(3);
    expect(root.querySelector('main a[href="/master-data"]')?.textContent).toContain('Master data');
    expect(root.querySelector('main a[href="/documents"]')?.textContent).toContain('Documents');
    expect(root.querySelector('main a[href="/reports"]')?.textContent).toContain('Reports');
  });

  it('opens a category overview from its welcome card without selecting a page', async () => {
    const root = harness.fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLAnchorElement>('main a[href="/documents"]')!.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/documents');
    expect(root.querySelector('main h1')?.textContent?.trim()).toBe('Documents');
    expect(root.querySelector('main a[href="/documents/goods-receipts"]')?.textContent).toContain('Goods receipts');
    expect(root.querySelector('erp-submenu header')?.textContent).toContain('Documents');
    expect(root.querySelector('erp-submenu a.bg-selected')).toBeNull();
    expect(root.querySelector('erp-primary-menu button[aria-label="Documents"]')?.getAttribute('aria-current')).toBe(
      'true',
    );
  });

  it('opens and closes the primaryMenuItem sidebar on welcome without selecting a category', async () => {
    const root = harness.fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector<HTMLButtonElement>('erp-primary-menu button[aria-label="Open sidebar"]')!;
    expect(toggle.disabled).toBe(false);
    toggle.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/');
    expect(root.querySelector('main h1')?.textContent).toContain('Welcome to Warehouse ERP');
    expect(root.querySelectorAll('erp-primary-menu button[aria-current]')).toHaveLength(0);
    expect(root.querySelectorAll('erp-submenu section a')).toHaveLength(3);
    expect(root.querySelector('erp-submenu a.bg-selected')).toBeNull();

    root.querySelector<HTMLButtonElement>('erp-primary-menu button[aria-label="Close sidebar"]')!.click();
    await harness.fixture.whenStable();
    expect(root.querySelector('erp-submenu')).toBeNull();
  });

  it('opens a category from the welcome sidebar', async () => {
    const root = harness.fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('erp-primary-menu button[aria-label="Open sidebar"]')!.click();
    await harness.fixture.whenStable();
    const documents = [...root.querySelectorAll<HTMLAnchorElement>('erp-submenu section a')].find(
      button => button.textContent?.trim() === 'Documents',
    )!;
    documents.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/documents');
    expect(root.querySelector('erp-submenu header')?.textContent).toContain('Documents');
    expect(root.querySelector('erp-submenu a.bg-selected')).toBeNull();
    expect(root.querySelector('main h1')?.textContent?.trim()).toBe('Documents');
  });

  it('navigates from an overview to a configured destination', async () => {
    await harness.navigateByUrl('/reports');
    const root = harness.fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLAnchorElement>('main a[href="/reports/stock-balances"]')!.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/reports/stock-balances');
    expect(root.querySelector('main h1')?.textContent?.trim()).toBe('Stock balances');
    expect(root.querySelector('erp-welcome')).toBeNull();
    expect(root.querySelector('erp-submenu a.bg-selected')?.textContent).toContain('Stock balances');
    expect(root.querySelector('main')?.textContent).toContain('This page is not available yet.');
  });

  it('navigates from the second-level sidebar and returns to an overview from the rail', async () => {
    await harness.navigateByUrl('/documents');
    const root = harness.fixture.nativeElement as HTMLElement;
    const receipts = [...root.querySelectorAll<HTMLAnchorElement>('erp-submenu section a')].find(button =>
      button.textContent?.includes('Goods receipts'),
    )!;
    receipts.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/documents/goods-receipts');
    expect(receipts.classList.contains('bg-selected')).toBe(true);

    root.querySelector<HTMLButtonElement>('erp-primary-menu button[aria-label="Documents"]')!.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/documents');
    expect(root.querySelector('erp-submenu-overview')).not.toBeNull();
    expect(root.querySelector('erp-welcome')).toBeNull();
    expect(root.querySelector('erp-submenu a.bg-selected')).toBeNull();
  });

  it('restores the category and selected item from a direct URL', async () => {
    await harness.navigateByUrl('/master-data/products');
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('main h1')?.textContent?.trim()).toBe('Products');
    expect(root.querySelector('erp-primary-menu button[aria-label="Master data"]')?.getAttribute('aria-current')).toBe(
      'true',
    );
    expect(root.querySelector('erp-submenu a.bg-selected')?.textContent?.trim()).toBe('Products');
  });

  it('restores overview and welcome states through browser history', async () => {
    await harness.navigateByUrl('/documents');
    await harness.navigateByUrl('/documents/goods-receipts');
    const location = TestBed.inject(Location);
    const root = harness.fixture.nativeElement as HTMLElement;

    let navigation = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    location.back();
    await navigation;
    await harness.fixture.whenStable();
    expect(router.url).toBe('/documents');
    expect(root.querySelector('main h1')?.textContent?.trim()).toBe('Documents');
    expect(root.querySelector('erp-submenu a.bg-selected')).toBeNull();

    navigation = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    location.back();
    await navigation;
    await harness.fixture.whenStable();
    expect(router.url).toBe('/');
    expect(root.querySelector('erp-submenu')).toBeNull();
    expect(root.querySelector('main h1')?.textContent).toContain('Welcome to Warehouse ERP');

    navigation = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    location.forward();
    await navigation;
    await harness.fixture.whenStable();
    expect(router.url).toBe('/documents');
    expect(root.querySelector('main h1')?.textContent?.trim()).toBe('Documents');
  });

  it('reopens the collapsed sidebar when selecting a category', async () => {
    await harness.navigateByUrl('/master-data');
    const root = harness.fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('erp-primary-menu button[aria-label="Close sidebar"]')!.click();
    await harness.fixture.whenStable();
    expect(root.querySelector('[inert]')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('erp-primary-menu button[aria-label="Reports"]')!.click();
    await harness.fixture.whenStable();
    expect(root.querySelector('[inert]')).toBeNull();
    expect(root.querySelector('main h1')?.textContent?.trim()).toBe('Reports');
  });

  it('returns to welcome through the Home link', async () => {
    await harness.navigateByUrl('/master-data/products');
    const root = harness.fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLAnchorElement>('erp-primary-menu a[aria-label="Home"]')!.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/');
    expect(root.querySelector('erp-submenu')).toBeNull();
    expect(root.querySelector('main h1')?.textContent).toContain('Welcome to Warehouse ERP');
  });

  it('preserves an unknown URL and shows a not-found page', async () => {
    await harness.navigateByUrl('/documents/unknown');
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(router.url).toBe('/documents/unknown');
    expect(root.querySelector('main h1')?.textContent).toContain('Page not found');
    expect(root.querySelector('erp-welcome')).toBeNull();
  });
});

describe('independent library mounts and menus', () => {
  it('moves a library link to another menu and changes its mount without changing library routes', async () => {
    const menu: MenuConfig = {
      primaryMenu: [
        { id: 'operations', title: 'Operations', icon: 'inventory', sidebarTitle: 'Operations', route: '/operations' },
      ],
      submenuGroups: [{ id: 'inventory', primaryMenuId: 'operations', title: 'Inventory' }],
      submenuItems: [
        {
          id: 'products',
          submenuGroupId: 'inventory',
          title: 'Products',
          target: { libraryId: 'master-data-library', path: 'products' },
        },
        {
          id: 'warehouses',
          submenuGroupId: 'inventory',
          title: 'Warehouses',
          target: { libraryId: 'master-data-library', path: 'warehouses' },
        },
      ],
    };
    const libraries = LIBRARY_MOUNTS.map(library => ({ ...library, path: 'custom/catalog' }));
    TestBed.configureTestingModule({ providers: [provideTestAuth(), provideRouter(createAppRoutes(menu, libraries))] });
    const harness = await RouterTestingHarness.create('/operations');
    const root = harness.fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    root.querySelector<HTMLAnchorElement>('main a[href="/custom/catalog/products"]')!.click();
    await harness.fixture.whenStable();
    expect(root.querySelector('main h1')?.textContent).toContain('Products');
    await harness.navigateByUrl('/custom/catalog/products/123/edit?tab=details#form');
    expect(root.querySelector('erp-submenu header')?.textContent).toContain('Operations');
    expect(root.querySelector('erp-submenu a.bg-selected')?.textContent?.trim()).toBe('Products');
    expect(root.querySelector('erp-primary-menu button[aria-label="Operations"]')?.getAttribute('aria-current')).toBe(
      'true',
    );

    await harness.navigateByUrl('/custom/catalog/warehouses/123/delete');
    expect(root.querySelector('erp-submenu a.bg-selected')?.textContent?.trim()).toBe('Warehouses');
    expect(root.querySelector('main')?.textContent).toContain('Main warehouse');

    await harness.navigateByUrl('/custom/catalog/products/123/unknown');
    expect(router.url).toBe('/custom/catalog/products/123/unknown');
    expect(root.querySelector('main h1')?.textContent).toContain('Page not found');
  });

  it('rejects duplicate ids and unknown library references', () => {
    expect(() => createAppRoutes(MENU_CONFIG, [...LIBRARY_MOUNTS, ...LIBRARY_MOUNTS])).toThrow('duplicate library id');
    expect(() => createAppRoutes(MENU_CONFIG, [])).toThrow('Unknown library');
    expect(() => createAppRoutes({ ...MENU_CONFIG, submenuGroups: [] }, LIBRARY_MOUNTS)).toThrow('Unknown group');
  });
});
