import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterOutlet } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';
import { filter, map, switchMap } from 'rxjs';

import { AppHeader, AppNavigation } from '../../components';
import { ADMIN_NAVIGATION } from '../../config';
import type { NavigationSection } from '../../types';

@Component({
  selector: 'app-layout',
  imports: [MatSidenavModule, RouterOutlet, AppHeader, AppNavigation],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  readonly auth = inject(WarehouseAuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly sidenav = viewChild.required(MatSidenav);

  readonly compact = toSignal(
    this.breakpointObserver.observe('(max-width: 959px)').pipe(map(result => result.matches)),
    {
      initialValue: false,
    },
  );
  readonly navigationCollapsed = signal(this.readNavigationCollapsed());
  readonly collapsed = computed(() => !this.compact() && this.navigationCollapsed());
  readonly navigation = computed<readonly NavigationSection[]>(() =>
    ADMIN_NAVIGATION.map(item =>
      'children' in item ? { ...item, children: item.children.filter(child => this.auth.can(child.permission)) } : item,
    ).filter(item => ('children' in item ? item.children.length > 0 : this.auth.can(item.permission))),
  );

  constructor() {
    toObservable(this.auth.authenticated)
      .pipe(
        filter(authenticated => authenticated && !this.auth.currentUser),
        switchMap(() => this.auth.ensureCurrentUser()),
        takeUntilDestroyed(),
      )
      .subscribe({ error: () => undefined });
  }

  login(): void {
    const url = this.router.parseUrl(this.router.url);
    const requestedRoute = url.queryParams['returnTo'];
    const currentRoute = this.router.url.startsWith('/') && !this.router.url.startsWith('//') ? this.router.url : '/';
    const returnTo =
      typeof requestedRoute === 'string' && requestedRoute.startsWith('/') && !requestedRoute.startsWith('//')
        ? requestedRoute
        : currentRoute;

    this.auth.login(returnTo);
  }

  toggleNavigation(): void {
    void this.sidenav().toggle();
  }

  toggleNavigationCollapsed(): void {
    this.navigationCollapsed.update(value => !value);
    try {
      localStorage.setItem('warehouse-admin.sidebar-collapsed', String(this.navigationCollapsed()));
    } catch {
      // Navigation remains usable when browser storage is unavailable.
    }
  }

  selectSection(): void {
    if (this.compact()) {
      void this.sidenav().close();
    }
  }

  private readNavigationCollapsed(): boolean {
    try {
      return localStorage.getItem('warehouse-admin.sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  }
}
