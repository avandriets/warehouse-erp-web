import { computed, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';

@Injectable()
export class AppSessionService {
  private readonly router = inject(Router);
  private readonly auth = inject(WarehouseAuthService);

  readonly loading = computed(() => this.auth.loading());
  readonly authenticated = computed(() => this.auth.authenticated());
  readonly failed = computed(() => !!this.auth.error());
  readonly email = computed(() => this.auth.currentUser?.email?.trim() || this.auth.user()?.email || null);
  readonly userName = computed(() => {
    const profile = this.auth.currentUser;
    const fullName = [profile?.first_name?.trim(), profile?.last_name?.trim()].filter(Boolean).join(' ');

    return (
      fullName ||
      profile?.display_name?.trim() ||
      profile?.email?.trim() ||
      this.auth.user()?.name?.trim() ||
      this.auth.user()?.email ||
      'Account'
    );
  });

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
