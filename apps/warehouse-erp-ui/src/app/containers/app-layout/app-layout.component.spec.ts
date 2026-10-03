import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom } from 'rxjs';

import { routes } from '../../app.routes';

describe('warehouse navigation', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideLocationMocks()] });
    router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
    harness = await RouterTestingHarness.create('/');
  });

  it('starts with a welcome screen and no selected category or sidebar', () => {
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('main h1')?.textContent).toContain('Welcome to Warehouse ERP');
    expect(root.querySelector('erp-workspace-sidebar')).toBeNull();
    expect(root.querySelector('erp-welcome')).not.toBeNull();
    expect(root.querySelector('erp-section-welcome')).toBeNull();
    expect(root.querySelectorAll('erp-navigation-rail button[aria-current]')).toHaveLength(0);
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
    expect(root.querySelector('erp-workspace-sidebar header')?.textContent).toContain('Documents');
    expect(root.querySelector('erp-workspace-sidebar button.bg-selected')).toBeNull();
    expect(root.querySelector('erp-navigation-rail button[aria-label="Documents"]')?.getAttribute('aria-current')).toBe(
      'true',
    );
  });

  it('opens and closes the section sidebar on welcome without selecting a category', async () => {
    const root = harness.fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector<HTMLButtonElement>('erp-navigation-rail button[aria-label="Open sidebar"]')!;
    expect(toggle.disabled).toBe(false);
    toggle.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/');
    expect(root.querySelector('main h1')?.textContent).toContain('Welcome to Warehouse ERP');
    expect(root.querySelectorAll('erp-navigation-rail button[aria-current]')).toHaveLength(0);
    expect(root.querySelectorAll('erp-workspace-sidebar section button')).toHaveLength(3);
    expect(root.querySelector('erp-workspace-sidebar button.bg-selected')).toBeNull();

    root.querySelector<HTMLButtonElement>('erp-navigation-rail button[aria-label="Close sidebar"]')!.click();
    await harness.fixture.whenStable();
    expect(root.querySelector('erp-workspace-sidebar')).toBeNull();
  });

  it('opens a category from the welcome sidebar', async () => {
    const root = harness.fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('erp-navigation-rail button[aria-label="Open sidebar"]')!.click();
    await harness.fixture.whenStable();
    const documents = [...root.querySelectorAll<HTMLButtonElement>('erp-workspace-sidebar section button')].find(
      button => button.textContent?.trim() === 'Documents',
    )!;
    documents.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/documents');
    expect(root.querySelector('erp-workspace-sidebar header')?.textContent).toContain('Documents');
    expect(root.querySelector('erp-workspace-sidebar button.bg-selected')).toBeNull();
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
    expect(root.querySelector('erp-workspace-sidebar button.bg-selected')?.textContent).toContain('Stock balances');
    expect(root.querySelector('main')?.textContent).toContain('This page is not available yet.');
  });

  it('navigates from the second-level sidebar and returns to an overview from the rail', async () => {
    await harness.navigateByUrl('/documents');
    const root = harness.fixture.nativeElement as HTMLElement;
    const receipts = [...root.querySelectorAll<HTMLButtonElement>('erp-workspace-sidebar section button')].find(
      button => button.textContent?.includes('Goods receipts'),
    )!;
    receipts.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/documents/goods-receipts');
    expect(receipts.classList.contains('bg-selected')).toBe(true);

    root.querySelector<HTMLButtonElement>('erp-navigation-rail button[aria-label="Documents"]')!.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/documents');
    expect(root.querySelector('erp-section-welcome')).not.toBeNull();
    expect(root.querySelector('erp-welcome')).toBeNull();
    expect(root.querySelector('erp-workspace-sidebar button.bg-selected')).toBeNull();
  });

  it('restores the category and selected item from a direct URL', async () => {
    await harness.navigateByUrl('/master-data/products');
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('main h1')?.textContent?.trim()).toBe('Products');
    expect(
      root.querySelector('erp-navigation-rail button[aria-label="Master data"]')?.getAttribute('aria-current'),
    ).toBe('true');
    expect(root.querySelector('erp-workspace-sidebar button.bg-selected')?.textContent?.trim()).toBe('Products');
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
    expect(root.querySelector('erp-workspace-sidebar button.bg-selected')).toBeNull();

    navigation = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    location.back();
    await navigation;
    await harness.fixture.whenStable();
    expect(router.url).toBe('/');
    expect(root.querySelector('erp-workspace-sidebar')).toBeNull();
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
    root.querySelector<HTMLButtonElement>('erp-navigation-rail button[aria-label="Close sidebar"]')!.click();
    await harness.fixture.whenStable();
    expect(root.querySelector('[inert]')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('erp-navigation-rail button[aria-label="Reports"]')!.click();
    await harness.fixture.whenStable();
    expect(root.querySelector('[inert]')).toBeNull();
    expect(root.querySelector('main h1')?.textContent?.trim()).toBe('Reports');
  });

  it('returns to welcome through the Home link', async () => {
    await harness.navigateByUrl('/master-data/products');
    const root = harness.fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLAnchorElement>('erp-navigation-rail a[aria-label="Home"]')!.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/');
    expect(root.querySelector('erp-workspace-sidebar')).toBeNull();
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
