import { computed, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';

@Injectable()
export class ShellSessionService {
  private readonly router = inject(Router);
  private readonly auth = inject(WarehouseAuthService);

  readonly loading = computed(() => this.auth.loading());
  readonly authenticated = computed(() => this.auth.authenticated());
  readonly failed = computed(() => !!this.auth.error());
  readonly userName = computed(() => this.auth.user()?.name ?? this.auth.user()?.email ?? 'Account');

  login(): void {
    const requestedRoute: unknown = this.router.parseUrl(this.router.url).queryParams['returnTo'];
    const fallback = this.router.url.startsWith('/error') ? '/' : this.router.url;
    const returnTo = typeof requestedRoute === 'string' ? requestedRoute : fallback;
    this.auth.login(
      returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\') ? returnTo : '/',
    );
  }

  logout(): void {
    this.auth.logout();
  }
}
