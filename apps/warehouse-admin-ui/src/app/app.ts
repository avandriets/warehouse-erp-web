import { BreakpointObserver } from '@angular/cdk/layout';
import { AsyncPipe } from '@angular/common';
import { Component, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { WarehouseAuth } from '@warehouse/auth';
import { map } from 'rxjs';

interface NavigationSection {
  path: string;
  title: string;
  description: string;
  permission: string;
}

@Component({
  selector: 'app-root',
  imports: [AsyncPipe, MatButtonModule, MatListModule, MatSidenavModule, MatToolbarModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(WarehouseAuth);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly sidenav = viewChild.required(MatSidenav);

  readonly compact = toSignal(this.breakpointObserver.observe('(max-width: 959px)').pipe(map(result => result.matches)), {
    initialValue: false,
  });
  readonly navigation: NavigationSection[] = [
    {
      path: '/users',
      title: 'Users',
      description: 'Employee accounts and ERP access',
      permission: 'users.manage',
    },
    {
      path: '/roles',
      title: 'Roles and permissions',
      description: 'Permission sets for working in the system',
      permission: 'users.manage',
    },
  ];

  login(): void {
    const returnTo = this.router.url.startsWith('/') && !this.router.url.startsWith('//') ? this.router.url : '/';

    this.auth.login(returnTo === '/login' ? '/' : returnTo);
  }

  toggleNavigation(): void {
    void this.sidenav().toggle();
  }

  selectSection(): void {
    if (this.compact()) {
      void this.sidenav().close();
    }
  }
}
