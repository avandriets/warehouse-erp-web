import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { ProductsPage } from './feature/products/containers';
import type { WarehousesPage } from './feature/warehouses/containers';
import { MASTER_DATA_ROUTES } from './master-data.routes';

describe.each(['products', 'warehouses'])('%s directory', kind => {
  let harness: RouterTestingHarness;
  let router: Router;
  const prefix = '/custom/catalog';

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'custom/catalog', children: MASTER_DATA_ROUTES }])],
    });
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  it('creates, edits and deletes records through relative routes under a custom mount', async () => {
    const listUrl = `${prefix}/${kind}`;
    await harness.navigateByUrl(listUrl);
    const root = harness.fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLAnchorElement>('a[href$="/create"]')!.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe(`${listUrl}/create`);

    for (const [field, value] of Object.entries({
      code: 'TEST-1',
      name: 'Test record',
      [kind === 'products' ? 'description' : 'address']: 'Test detail',
    })) {
      const input = root.querySelector<HTMLInputElement>(`[name="${field}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe(listUrl);
    expect(root.textContent).toContain('Test record');

    root.querySelector<HTMLAnchorElement>('a[aria-label="Edit Test record"]')!.click();
    await harness.fixture.whenStable();
    const name = root.querySelector<HTMLInputElement>('[name="name"]')!;
    expect(name.value).toBe('Test record');
    name.value = 'Updated record';
    name.dispatchEvent(new Event('input'));
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await harness.fixture.whenStable();
    expect(root.textContent).toContain('Updated record');

    root.querySelector<HTMLAnchorElement>('a[aria-label="Delete Updated record"]')!.click();
    await harness.fixture.whenStable();
    expect(root.textContent).toContain('Delete Updated record');
    const confirm = [...root.querySelectorAll<HTMLButtonElement>('button')].find(button =>
      button.textContent?.includes('Confirm deletion'),
    )!;
    confirm.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe(listUrl);
    expect(root.textContent).not.toContain('Updated record');
  });

  it('requires confirmation and cancellation leaves the record intact', async () => {
    await harness.navigateByUrl(`${prefix}/${kind}/123/delete`);
    const page = harness.routeDebugElement!.componentInstance as ProductsPage | WarehousesPage;
    expect(page.record()).toBeDefined();
    page.back();
    await harness.fixture.whenStable();
    expect(router.url).toBe(`${prefix}/${kind}`);
    expect(harness.fixture.nativeElement.textContent).toContain(kind === 'products' ? 'Packing box' : 'Main warehouse');
  });

  it('rejects blank and duplicate values without losing form input', async () => {
    await harness.navigateByUrl(`${prefix}/${kind}/create`);
    const page = harness.routeDebugElement!.componentInstance as ProductsPage | WarehousesPage;
    page.save();
    expect(page.form.invalid).toBe(true);
    expect(router.url).toContain('/create');
    page.form.patchValue({ code: kind === 'products' ? 'PRD-001' : 'WH-001', name: 'Duplicate' });
    page.save();
    expect(page.error()).toContain('already exists');
    expect(page.form.controls.name.value).toBe('Duplicate');
  });

  it('handles missing records and updates the form when only the id changes', async () => {
    await harness.navigateByUrl(`${prefix}/${kind}/missing/edit`);
    const page = harness.routeDebugElement!.componentInstance as ProductsPage | WarehousesPage;
    expect(page.missing()).toBe(true);
    await harness.navigateByUrl(`${prefix}/${kind}/123/edit`);
    expect(page.missing()).toBe(false);
    expect(page.form.controls.code.value).toBe(kind === 'products' ? 'PRD-001' : 'WH-001');
    await harness.navigateByUrl(`${prefix}/${kind}/124/edit`);
    expect(page.form.controls.code.value).toBe(kind === 'products' ? 'PRD-002' : 'WH-002');
  });
});
