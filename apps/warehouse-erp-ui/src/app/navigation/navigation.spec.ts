import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideAccessManagement } from '@warehouse/access-management';

import { createAppRoutes } from '../app.routes';
import { LIBRARY_MOUNTS } from '../config/library-mounts.config';
import { MENU_CONFIG } from '../config/menu.config';
import { provideTestAuth } from '../testing/provide-test-auth';
import type { LibraryMount, MenuConfig } from '../types';
import { assembleMenu } from './assemble-menu';

const menu: MenuConfig = {
  primaryMenu: [
    { id: 'catalog', route: '/catalog', title: 'Catalog', icon: 'category', sidebarTitle: 'Catalog' },
    { id: 'operations', route: '/operations', title: 'Operations', icon: 'inventory', sidebarTitle: 'Operations' },
  ],
  submenuGroups: [{ id: 'inventory', primaryMenuId: 'catalog', title: 'Inventory' }],
  submenuItems: [
    {
      id: 'products',
      submenuGroupId: 'inventory',
      title: 'Products',
      target: { libraryId: 'catalog-library', path: 'products' },
    },
    {
      id: 'warehouses',
      submenuGroupId: 'inventory',
      title: 'Warehouses',
      target: { libraryId: 'catalog-library', path: 'warehouses' },
    },
  ],
};
const libraries: readonly LibraryMount[] = [{ id: 'catalog-library', path: 'data', loadChildren: async () => [] }];

describe('navigation configuration contracts', () => {
  it('reserves the shell error route when mounting libraries', () => {
    expect(() => createAppRoutes(menu, [{ ...libraries[0], path: 'error' }])).toThrow('reserved');
  });
  it('moves a whole group by changing its parent without changing links or library mounts', () => {
    const moved = { ...menu, submenuGroups: [{ ...menu.submenuGroups[0], primaryMenuId: 'operations' }] };
    const navigation = assembleMenu(moved, libraries);
    expect(navigation[0].groups).toHaveLength(0);
    expect(navigation[1].groups[0].items.map(item => item.route)).toEqual(['/data/products', '/data/warehouses']);
    expect(menu.submenuGroups[0].primaryMenuId).toBe('catalog');
  });

  it.each(['', '/data', 'data/', 'data//catalog', 'data/../catalog', 'data?x=1', 'data#tab', ':id', '**'])(
    'rejects invalid library mount "%s"',
    path => {
      expect(() => createAppRoutes(menu, [{ ...libraries[0], path }])).toThrow('library mount path');
    },
  );

  it.each(['/products', 'products/', '../products', 'products?tab=1', 'products/:id'])(
    'rejects invalid relative public entry "%s"',
    path => {
      const invalid = {
        ...menu,
        submenuItems: [{ ...menu.submenuItems[0], target: { libraryId: 'catalog-library', path } }],
      };
      expect(() => createAppRoutes(invalid, libraries)).toThrow('Invalid library entry path');
    },
  );

  it('rejects unknown parent menus and duplicate menu item ids', () => {
    expect(() =>
      createAppRoutes({ ...menu, submenuGroups: [{ ...menu.submenuGroups[0], primaryMenuId: 'missing' }] }, libraries),
    ).toThrow('Unknown primary menu');
    expect(() =>
      createAppRoutes({ ...menu, submenuItems: [...menu.submenuItems, menu.submenuItems[0]] }, libraries),
    ).toThrow('duplicate submenu item id');
  });

  it('rejects overlapping mounts and ambiguous destinations', () => {
    expect(() => createAppRoutes(menu, [...libraries, { ...libraries[0], id: 'other', path: 'data/nested' }])).toThrow(
      'Overlapping library mounts',
    );
    expect(() =>
      createAppRoutes(
        { ...menu, submenuItems: [menu.submenuItems[0], { ...menu.submenuItems[0], id: 'duplicate-url' }] },
        libraries,
      ),
    ).toThrow('duplicate submenu destination');
  });

  it('rejects placeholder and overview routes that shadow library entry points', () => {
    expect(() =>
      createAppRoutes(menu, libraries, [{ path: 'data/products', title: 'Placeholder', primaryMenuRoute: '/catalog' }]),
    ).toThrow('Placeholder shadows public library entry');
    expect(() =>
      createAppRoutes(menu, libraries, [{ path: 'catalog', title: 'Placeholder', primaryMenuRoute: '/catalog' }]),
    ).toThrow('Placeholder route conflicts');
    expect(() =>
      createAppRoutes(
        { ...menu, primaryMenu: [{ ...menu.primaryMenu[0], route: '/data/products' }, menu.primaryMenu[1]] },
        libraries,
      ),
    ).toThrow('Menu overview shadows');
  });

  it('resolves every configured library menu entry to a real screen', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAccessManagement({ apiUrl: '/api' }),
        provideTestAuth(),
        provideRouter(createAppRoutes(MENU_CONFIG, LIBRARY_MOUNTS)),
      ],
    });
    const harness = await RouterTestingHarness.create();
    for (const item of MENU_CONFIG.submenuItems) {
      if ('libraryId' in item.target) {
        const target = item.target;
        const library = LIBRARY_MOUNTS.find(entry => entry.id === target.libraryId)!;
        await harness.navigateByUrl(`/${library.path}/${target.path}`);
        const root = harness.fixture.nativeElement as HTMLElement;
        if (target.libraryId === 'master-data-library') {
          expect(root.querySelector('md-directory-table')).not.toBeNull();
        } else {
          const request = TestBed.inject(HttpTestingController).expectOne(
            req => req.url === `/api/identity/${target.path}`,
          );
          request.flush(target.path === 'users' ? { items: [], total: 0 } : []);
          await harness.fixture.whenStable();
          expect(root.querySelector('ui-page-layout h1')?.textContent).toContain(item.title);
        }
        expect(root.querySelector('erp-unavailable')).toBeNull();
        expect(root.querySelector('erp-submenu a.bg-selected')?.textContent?.trim()).toBe(item.title);
      }
    }
    TestBed.inject(HttpTestingController).verify();
  });
});
