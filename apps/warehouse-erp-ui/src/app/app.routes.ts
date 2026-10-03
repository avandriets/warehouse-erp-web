import type { Routes } from '@angular/router';

import { APP_NAVIGATION } from './app-navigation.config';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers').then(module => module.AppLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Welcome · Warehouse ERP',
        loadComponent: () => import('./components').then(module => module.WelcomeComponent),
      },
      ...APP_NAVIGATION.map(section => ({
        path: section.route.slice(1),
        data: { navigationSection: section.id },
        children: [
          {
            path: '',
            pathMatch: 'full' as const,
            title: `${section.title} · Warehouse ERP`,
            loadComponent: () => import('./components').then(module => module.SectionWelcomeComponent),
          },
          ...section.groups.flatMap(group =>
            group.items.map(item => ({
              path: item.route.slice(section.route.length + 1),
              title: `${item.title} · Warehouse ERP`,
              data: {
                navigationSection: section.id,
                navigationItem: item.id,
                pageTitle: item.title,
                sectionRoute: section.route,
                status: 503,
              },
              // Replace this destination with the feature library's lazy routes when available.
              loadComponent: () => import('./pages').then(module => module.UnavailableComponent),
            })),
          ),
        ],
      })),
      {
        path: '**',
        title: 'Page not found · Warehouse ERP',
        data: { status: 404 },
        loadComponent: () => import('./pages').then(module => module.UnavailableComponent),
      },
    ],
  },
];
