import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';

import { AUTH_CONFIG } from '../providers';
import type { CurrentUser } from '../types';

@Injectable({ providedIn: 'root' })
export class WarehouseAuth {
  private readonly sdk = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly config = inject(AUTH_CONFIG);
  private readonly identity = signal<CurrentUser | null>(null);
  readonly isLoading$ = this.sdk.isLoading$;
  readonly isAuthenticated$ = this.sdk.isAuthenticated$;
  readonly user$ = this.sdk.user$;
  readonly error$ = this.sdk.error$;

  get currentUser(): CurrentUser | null {
    return this.identity();
  }

  set currentUser(user: CurrentUser | null) {
    this.identity.set(user);
  }

  login(returnTo = '/'): void {
    this.sdk.loginWithRedirect({ appState: { target: returnTo } });
  }

  signup(): void {
    this.sdk.loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } });
  }

  logout(): void {
    this.currentUser = null;
    this.sdk.logout({ logoutParams: { returnTo: window.location.origin } });
  }

  loadUser(): Observable<CurrentUser> {
    this.currentUser = null;

    return this.http.get<CurrentUser>(`${this.config.apiUrl}/identity/me`).pipe(tap(user => (this.currentUser = user)));
  }

  can(permission: string): boolean {
    return this.currentUser?.status === 'ACTIVE' && this.currentUser.permissions.includes(permission);
  }
}
