import type { Route, Routes } from '@angular/router';
import { permissionGuard, WarehouseAuthService } from '@warehouse/auth';

import { PLACEHOLDER_PAGES } from './config/app-placeholders.config';
import { LIBRARY_MOUNTS } from './config/library-mounts.config';
import { MENU_CONFIG } from './config/menu.config';
import { PRIMARY_MENU_WITH_SUBMENUS_TOKEN } from './config/primary-menu-with-submenus.token';
import { assembleMenu, validateRouteConfiguration } from './navigation';
import { AppSessionService, MenuSelectionService } from './services';
import type { LibraryMount, MenuConfig, PlaceholderPage, PrimaryMenuItem } from './types';

export function createAppRoutes(
  menu: MenuConfig,
  libraries: readonly LibraryMount[],
  placeholders: readonly PlaceholderPage[] = [],
): Routes {
  const navigation = assembleMenu(menu, libraries);
  validateRouteConfiguration(menu, libraries, placeholders, navigation);

  const featureRoutes: Routes = [
    ...menu.primaryMenu.map(createOverviewRoute),
    ...libraries.map(library => ({
      path: library.path,
      loadChildren: library.loadChildren,
      canActivate: [permissionGuard],
      canActivateChild: [permissionGuard],
      data: { permission: library.permission },
    })),
    { path: 'users', redirectTo: '/administration/users', pathMatch: 'prefix' },
    { path: 'roles', redirectTo: '/administration/roles', pathMatch: 'prefix' },
    ...placeholders.map(createPlaceholderRoute),
    {
      path: '**',
      title: 'Page not found · Warehouse ERP',
      data: { status: 404 },
      loadComponent: () => import('./components').then(module => module.UnavailableComponent),
    },
  ];

  return [
    {
      path: '',
      providers: [
        {
          provide: PRIMARY_MENU_WITH_SUBMENUS_TOKEN,
          useFactory: (auth: WarehouseAuthService) =>
            navigation.filter(item => !item.permission || auth.can(item.permission)),
          deps: [WarehouseAuthService],
        },
        MenuSelectionService,
        AppSessionService,
      ],
      children: [
        {
          path: 'error',
          title: 'Access · Warehouse ERP',
          data: { status: 503 },
          loadComponent: () => import('./components').then(module => module.UnavailableComponent),
        },
        {
          path: '',
          canActivate: [permissionGuard],
          canActivateChild: [permissionGuard],
          loadComponent: () => import('./containers').then(module => module.AppLayoutComponent),
          children: [
            {
              path: '',
              pathMatch: 'full',
              title: 'Welcome · Warehouse ERP',
              loadComponent: () => import('./components').then(module => module.WelcomeComponent),
            },
            ...featureRoutes,
          ],
        },
      ],
    },
  ];
}

function createOverviewRoute(primaryMenuItem: PrimaryMenuItem): Route {
  return {
    path: primaryMenuItem.route.slice(1),
    pathMatch: 'full',
    title: `${primaryMenuItem.title} · Warehouse ERP`,
    canActivate: [permissionGuard],
    data: { primaryMenuId: primaryMenuItem.id, permission: primaryMenuItem.permission },
    loadComponent: () => import('./components').then(module => module.SubmenuOverviewComponent),
  };
}

function createPlaceholderRoute(page: PlaceholderPage): Route {
  return {
    path: page.path,
    title: `${page.title} · Warehouse ERP`,
    data: { pageTitle: page.title, primaryMenuRoute: page.primaryMenuRoute, status: 503 },
    loadComponent: () => import('./components').then(module => module.UnavailableComponent),
  };
}

export const routes: Routes = createAppRoutes(MENU_CONFIG, LIBRARY_MOUNTS, PLACEHOLDER_PAGES);
