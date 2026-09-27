import type { Route, Routes } from '@angular/router';

export const ACCESS_MANAGEMENT_PAGES = {
  users: {
    path: 'users',
    title: 'Users · Warehouse ERP',
    loadChildren: () => import('@warehouse/access-management/feature/users').then(module => module.USER_ROUTES),
  },
  roles: {
    path: 'roles',
    title: 'Roles and permissions · Warehouse ERP',
    loadChildren: () => import('@warehouse/access-management/feature/roles').then(module => module.ROLE_ROUTES),
  },
} satisfies Record<string, Route>;

export const ACCESS_MANAGEMENT_ROUTES: Routes = Object.values(ACCESS_MANAGEMENT_PAGES);
