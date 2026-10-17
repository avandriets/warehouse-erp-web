import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { MASTER_DATA_CONFIG } from '../../config';
import type { Category } from '../../types';
import { CATEGORIES_ROUTES } from './categories.routes';
import { CategorySelect, DeleteCategoryDialog } from './components';
import { Categories, CategoryEditor } from './containers';

const base = '/api/catalog/categories';
const category: Category = {
  id: 'cat-1',
  code: 'RAW',
  name: 'Raw materials',
  parent_id: null,
  description: 'Materials',
  active: true,
  created_at: '2026-10-12T00:00:00Z',
  updated_at: '2026-10-12T00:00:00Z',
};

describe('categories workflow', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const snackBar = { open: vi.fn() };
  const can = vi.fn(() => true);
  const guard = vi.fn(() => true);
  const dialog = { open: vi.fn() };
  beforeEach(async () => {
    snackBar.open.mockClear();
    can.mockReset().mockReturnValue(true);
    guard.mockClear();
    dialog.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'custom/categories', children: CATEGORIES_ROUTES }]),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api', hasPermission: can, permissionGuard: guard } },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());

  function references(items = [category]): void {
    for (const request of http.match(
      req => req.method === 'GET' && req.url === base && req.params.get('limit') === '100',
    )) {
      request.flush({ items, total: items.length });
    }
    harness.detectChanges();
  }

  it('loads paginated search, filters roots, and navigates to direct children without loading a whole tree', async () => {
    const page = await harness.navigateByUrl('/custom/categories?q=Raw&offset=10&limit=10', Categories);
    const request = http.expectOne(req => req.url === base);
    expect(request.request.params.get('q')).toBe('Raw');
    expect(request.request.params.get('active')).toBe('true');
    request.flush({ items: [category], total: 21 });
    expect(page.total()).toBe(21);
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('mat-paginator')).not.toBeNull();
    const children = harness.routeNativeElement!.querySelector<HTMLAnchorElement>(
      'a[aria-label="Show subcategories of Raw materials"]',
    )!;
    children.click();
    await harness.fixture.whenStable();
    const childRequest = http.expectOne(req => req.url === base);
    expect(childRequest.request.params.get('parent_id')).toBe('cat-1');
    expect(childRequest.request.params.has('q')).toBe(false);
    expect(childRequest.request.params.get('offset')).toBe('0');
    childRequest.flush({ items: [], total: 0 });
    expect(page.scope.value).toBe('children');
    page.scope.setValue('roots');
    await harness.fixture.whenStable();
    const roots = http.expectOne(req => req.url === base);
    expect(roots.request.params.get('root_only')).toBe('true');
    expect(roots.request.params.has('parent_id')).toBe(false);
    roots.flush({ items: [category], total: 1 });
    page.status.setValue('all');
    await harness.fixture.whenStable();
    const all = http.expectOne(req => req.url === base);
    expect(all.request.params.has('active')).toBe(false);
    expect(all.request.params.get('root_only')).toBe('true');
    all.flush({ items: [category], total: 1 });
  });

  it('shows parent names from the page response, including archived parents, without extra requests', async () => {
    await harness.navigateByUrl('/custom/categories', Categories);
    const child = {
      ...category,
      id: 'child',
      code: 'WOOD',
      name: 'Wood',
      parent_id: 'cat-1',
      parent: { id: 'cat-1', code: 'RAW', name: 'Renamed parent', active: false },
    };
    http.expectOne(req => req.url === base).flush({ items: [{ ...category, parent: null }, child], total: 2 });
    harness.detectChanges();
    const cells = harness.routeNativeElement!.querySelectorAll<HTMLElement>('td.mat-column-parent');
    expect(cells[0].textContent?.trim()).toBe('—');
    expect(cells[1].textContent).toContain('Renamed parent');
    expect(cells[1].textContent).toContain('Archived');
    http.expectNone(() => true);
    cells[1].querySelector<HTMLAnchorElement>('a')!.click();
    await harness.fixture.whenStable();
    const children = http.expectOne(req => req.url === base);
    expect(children.request.params.get('parent_id')).toBe('cat-1');
    children.flush({ items: [child], total: 1 });
  });

  it('renders a root-to-current path on a bookmarked empty page and navigates through ancestors', async () => {
    const page = await harness.navigateByUrl(
      '/custom/categories?parent_id=leaf&q=missing&active=all&offset=25&limit=10',
      Categories,
    );
    const path = [
      { id: 'root', code: 'ROOT', name: 'Renamed root', active: false },
      { id: 'child', code: 'CHILD', name: 'Child', active: true },
      { id: 'leaf', code: 'LEAF', name: 'Leaf', active: true },
    ];
    http.expectOne(req => req.url === base).flush({ items: [], total: 0, ancestors: path });
    harness.detectChanges();
    expect(page.ancestors()).toEqual(path);
    const breadcrumb = harness.routeNativeElement!.querySelector<HTMLElement>('nav[aria-label="Breadcrumb"]')!;
    expect(breadcrumb.textContent).toContain('Renamed root');
    expect(breadcrumb.textContent).toContain('Child');
    expect(breadcrumb.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Leaf');
    const childLink = [...breadcrumb.querySelectorAll<HTMLAnchorElement>('a')].find(
      link => link.textContent?.trim() === 'Child',
    )!;
    childLink.click();
    await harness.fixture.whenStable();
    const children = http.expectOne(req => req.url === base);
    expect(children.request.params.get('parent_id')).toBe('child');
    expect(children.request.params.get('offset')).toBe('0');
    expect(children.request.params.get('limit')).toBe('10');
    expect(children.request.params.has('active')).toBe(false);
    expect(children.request.params.has('q')).toBe(false);
    children.flush({ items: [], total: 0, ancestors: path.slice(0, 2) });
    harness.detectChanges();
    expect(breadcrumb.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Child');
    breadcrumb.querySelector<HTMLAnchorElement>('a')!.click();
    await harness.fixture.whenStable();
    const all = http.expectOne(req => req.url === base);
    expect(all.request.params.has('parent_id')).toBe(false);
    all.flush({ items: [], total: 0 });
    harness.detectChanges();
    expect(page.ancestors()).toEqual([]);
    expect(breadcrumb.textContent).not.toContain('Child');
  });

  it('hides the old path while navigating and cancels stale category requests', async () => {
    const page = await harness.navigateByUrl('/custom/categories?parent_id=old', Categories);
    http
      .expectOne(req => req.url === base)
      .flush({ items: [], total: 0, ancestors: [{ id: 'old', code: 'OLD', name: 'Old branch', active: true }] });
    harness.detectChanges();
    expect(page.ancestors()[0].name).toBe('Old branch');
    await harness.navigateByUrl('/custom/categories?parent_id=pending', Categories);
    const pending = http.expectOne(req => req.url === base);
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('nav')!.textContent).not.toContain('Old branch');
    await harness.navigateByUrl('/custom/categories?parent_id=new', Categories);
    expect(pending.cancelled).toBe(true);
    http
      .expectOne(req => req.url === base)
      .flush({ items: [], total: 0, ancestors: [{ id: 'new', code: 'NEW', name: 'New branch', active: true }] });
    harness.detectChanges();
    expect(page.ancestors()[0].name).toBe('New branch');
  });

  it('creates a root with normalized values and blocks duplicate saves', async () => {
    const page = await harness.navigateByUrl('/custom/categories/create', CategoryEditor);
    references();
    page.form.patchValue({ code: ' ', name: ' ' });
    page.save();
    http.expectNone(base);
    page.form.patchValue({ code: ' RAW ', name: ' Raw materials ', description: '  ' });
    page.save();
    page.save();
    const request = http.expectOne(base);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: 'RAW', name: 'Raw materials', description: null, parent_id: null });
    request.flush(category);
    expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('Category created.', 'Dismiss', { duration: 4000 });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/custom/categories');
    http.expectOne(req => req.url === base).flush({ items: [category], total: 1 });
  });

  it('prefills the parent when creating within a category and does not discard it', async () => {
    const page = await harness.navigateByUrl('/custom/categories/create?parent_id=cat-1', CategoryEditor);
    references();
    expect(page.form.controls.parent_id.value).toBe('cat-1');
    page.form.patchValue({ code: 'WOOD', name: 'Wood' });
    page.save();
    const request = http.expectOne(base);
    expect(request.request.body.parent_id).toBe('cat-1');
    request.flush({ ...category, id: 'child', code: 'WOOD', name: 'Wood', parent_id: 'cat-1' });
    await harness.fixture.whenStable();
    const list = http.expectOne(req => req.url === base);
    expect(list.request.params.get('parent_id')).toBe('cat-1');
    list.flush({ items: [], total: 0 });
  });

  it('clears the parent and description, keeps code immutable, and preserves input after a cycle error', async () => {
    const page = await harness.navigateByUrl('/custom/categories/cat-1/edit', CategoryEditor);
    references([category, { ...category, id: 'child', name: 'Child' }]);
    http.expectOne(`${base}/cat-1`).flush(category);
    harness.detectChanges();
    expect(page.form.controls.code.disabled).toBe(true);
    page.form.patchValue({ name: 'Changed', description: '', parent_id: 'child' });
    harness.detectChanges();
    page.save();
    const request = http.expectOne(`${base}/cat-1`);
    expect(request.request.body).toEqual({ name: 'Changed', description: null, parent_id: 'child' });
    request.flush({ detail: 'Category hierarchy cannot contain a cycle' }, { status: 422, statusText: 'Invalid' });
    expect(page.form.controls.name.value).toBe('Changed');
    expect(page.form.controls.code.disabled).toBe(true);
    expect(page.actionError()).toContain('cycle');
    expect(page.state().pending).toBe(false);
    page.form.controls.parent_id.setValue(null);
    page.save();
    const retry = http.expectOne(`${base}/cat-1`);
    expect(retry.request.body.parent_id).toBeNull();
    retry.flush({ ...category, parent_id: null, description: null });
    await harness.fixture.whenStable();
    http.expectOne(req => req.url === base).flush({ items: [category], total: 1 });
  });

  it('shows one load error and restores fields on retry', async () => {
    const page = await harness.navigateByUrl('/custom/categories/cat-1/edit', CategoryEditor);
    references();
    http.expectOne(`${base}/cat-1`).flush({ detail: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(page.actionError()).toBeNull();
    page.load();
    references();
    http.expectOne(`${base}/cat-1`).flush(category);
    expect(page.form.controls.name.value).toBe('Raw materials');
  });

  it('waits for complete category options, excludes descendants locally and retries one lookup failure', async () => {
    const page = await harness.navigateByUrl('/custom/categories/cat-1/edit', CategoryEditor);
    http.expectOne(`${base}/cat-1`).flush(category);
    expect(page.state().resolved).toBe(false);
    http.expectOne(req => req.url === base && req.params.get('limit') === '100').error(new ProgressEvent('error'));
    harness.detectChanges();
    expect(page.state().rejected).toBe(true);
    expect(harness.routeNativeElement?.querySelectorAll('[role="alert"]')).toHaveLength(1);
    page.load();
    const grandchild = { ...category, id: 'grandchild', parent_id: 'child' };
    references([
      grandchild,
      { ...category, id: 'child', parent_id: category.id },
      category,
      { ...category, id: 'other' },
    ]);
    http.expectOne(`${base}/cat-1`).flush(category);
    harness.detectChanges();
    expect(page.state().resolved).toBe(true);
    expect(page.parentOptions().map(option => option.id)).toEqual(['other']);
    http.expectNone(req => req.method === 'GET');
  });

  it('uses catalog permissions and gives read-only users access to subcategory navigation', async () => {
    can.mockReturnValue(false);
    const page = await harness.navigateByUrl('/custom/categories', Categories);
    http.expectOne(req => req.url === base).flush({ items: [category], total: 1 });
    harness.detectChanges();
    page.deleteRecord(category);
    expect(dialog.open).not.toHaveBeenCalled();
    expect(harness.routeNativeElement?.querySelector('a[href$="create"]')).toBeNull();
    expect(
      harness.routeNativeElement?.querySelector('a[aria-label="Show subcategories of Raw materials"]'),
    ).not.toBeNull();
    expect(CATEGORIES_ROUTES.map(route => route.data?.['permission'])).toEqual([
      'catalog.read',
      'catalog.create',
      'catalog.edit',
    ]);
  });
});

describe('CategorySelect local options', () => {
  const option = category;
  it('resolves parent-provided ids, filters locally, and emits selected ids', () => {
    const fixture = TestBed.createComponent(CategorySelect);
    fixture.componentRef.setInput('items', [option, { ...option, id: 'archived', active: false }]);

    fixture.detectChanges();
    const picker = fixture.componentInstance;
    const changed = vi.fn();
    picker.registerOnChange(changed);
    picker.writeValue(option.id);
    fixture.detectChanges();
    expect(picker.value.value).toEqual(option);
    expect(changed).not.toHaveBeenCalled();
    picker.search();
    expect(picker.options()).toEqual([option]);
    picker.value.setValue('does not exist');
    expect(picker.options()).toEqual([]);
    expect(picker.validate()).toEqual({ categorySelection: true });
    picker.value.setValue(option);
    expect(picker.validate()).toBeNull();
    expect(changed).toHaveBeenLastCalledWith(option.id);
    picker.clear();
    expect(changed).toHaveBeenLastCalledWith(null);
  });
  it('retains archived selections and rejects ids missing from the snapshot', () => {
    const fixture = TestBed.createComponent(CategorySelect);
    fixture.componentRef.setInput('items', [{ ...option, active: false }]);
    fixture.componentRef.setInput('allowArchived', true);

    const picker = fixture.componentInstance;
    picker.writeValue(option.id);
    fixture.detectChanges();
    expect(picker.validate()).toBeNull();
    expect(picker.options()).toEqual([]);
    picker.writeValue('missing');
    expect(picker.validate()).toEqual({ categorySelection: true });
    fixture.componentRef.setInput('items', [{ ...option, id: 'missing' }]);
    fixture.detectChanges();
    expect(picker.value.value).toEqual({ ...option, id: 'missing' });
    expect(picker.validate()).toBeNull();
  });
});

describe('category archive dialog', () => {
  let http: HttpTestingController;
  const ref = { close: vi.fn(), disableClose: false };
  const snackBar = { open: vi.fn() };
  beforeEach(() => {
    ref.close.mockClear();
    ref.disableClose = false;
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api' } },
        { provide: MAT_DIALOG_DATA, useValue: category },
        { provide: MatDialogRef, useValue: ref },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('archives only the chosen category without deleting the tree or fabricating a version field', () => {
    const page = TestBed.createComponent(DeleteCategoryDialog).componentInstance;
    http.expectNone(() => true);
    page.confirm();
    page.confirm();
    const request = http.expectOne(`${base}/cat-1`);
    expect(request.request.body).toEqual({ active: false });
    request.flush({ detail: 'Denied' }, { status: 403, statusText: 'Forbidden' });
    expect(ref.close).not.toHaveBeenCalled();
    expect(ref.disableClose).toBe(false);
    page.confirm();
    http.expectOne(`${base}/cat-1`).flush({ ...category, active: false });
    expect(ref.close).toHaveBeenCalledWith({ ...category, active: false });
    expect(snackBar.open).toHaveBeenLastCalledWith('Category archived.', 'Dismiss', { duration: 4000 });
  });
});
