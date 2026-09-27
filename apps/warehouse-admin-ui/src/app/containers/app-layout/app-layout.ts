import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterOutlet } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';
import { map } from 'rxjs';

import { AppHeader, AppNavigation } from '../../components';
import { ADMIN_NAVIGATION } from '../../config';
import type { NavigationSection } from '../../types';

@Component({
  selector: 'app-layout',
  imports: [MatSidenavModule, RouterOutlet, AppHeader, AppNavigation],
  templateUrl: './app-layout.html',
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

  login(): void {
    const returnTo = this.router.url.startsWith('/') && !this.router.url.startsWith('//') ? this.router.url : '/';

    this.auth.login(returnTo === '/login' ? '/' : returnTo);
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
