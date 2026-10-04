import type { Route, Routes } from '@angular/router';

import { PLACEHOLDER_PAGES } from './config/app-placeholders.config';
import { LIBRARY_MOUNTS } from './config/library-mounts.config';
import { MENU_CONFIG } from './config/menu.config';
import { PRIMARY_MENU_WITH_SUBMENUS_TOKEN } from './config/primary-menu-with-submenus.token';
import { assembleMenu, validateRouteConfiguration } from './navigation';
import { MenuSelectionService } from './services';
import type { LibraryMount, MenuConfig,PlaceholderPage, PrimaryMenuItem } from './types';

export function createAppRoutes(
  menu: MenuConfig,
  libraries: readonly LibraryMount[],
  placeholders: readonly PlaceholderPage[] = [],
): Routes {
  const navigation = assembleMenu(menu, libraries);
  validateRouteConfiguration(menu, libraries, placeholders, navigation);

  return [
    {
      path: '',
      providers: [{ provide: PRIMARY_MENU_WITH_SUBMENUS_TOKEN, useValue: navigation }, MenuSelectionService],
      loadComponent: () => import('./containers').then(module => module.AppLayoutComponent),
      children: [
        {
          path: '',
          pathMatch: 'full',
          title: 'Welcome · Warehouse ERP',
          loadComponent: () => import('./components').then(module => module.WelcomeComponent),
        },
        ...menu.primaryMenu.map(createOverviewRoute),
        ...libraries.map(library => ({ path: library.path, loadChildren: library.loadChildren })),
        ...placeholders.map(createPlaceholderRoute),
        {
          path: '**',
          title: 'Page not found · Warehouse ERP',
          data: { status: 404 },
          loadComponent: () => import('./components').then(module => module.UnavailableComponent),
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
    data: { primaryMenuId: primaryMenuItem.id },
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
