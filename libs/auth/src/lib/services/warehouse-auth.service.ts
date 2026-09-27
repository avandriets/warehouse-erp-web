import { inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '@auth0/auth0-angular';
import type { Observable } from 'rxjs';
import { finalize, of, shareReplay, tap } from 'rxjs';

import { AUTH_CONFIG } from '../providers';
import type { CurrentUser } from '../types';
import { IdentityApiService } from './identity-api.service';

@Injectable({ providedIn: 'root' })
export class WarehouseAuthService {
  private readonly config = inject(AUTH_CONFIG);
  private readonly auth = inject(AuthService);
  private readonly identityApi = inject(IdentityApiService);
  private readonly identity = signal<CurrentUser | null>(null);
  private currentUserRequest$: Observable<CurrentUser> | null = null;

  readonly authenticated = toSignal(this.auth.isAuthenticated$, { initialValue: false });
  readonly loading = toSignal(this.auth.isLoading$, { initialValue: true });
  readonly error = toSignal(this.auth.error$, { initialValue: null });
  readonly user = toSignal(this.auth.user$, { initialValue: null });

  get currentUser(): CurrentUser | null {
    return this.identity();
  }

  set currentUser(user: CurrentUser | null) {
    this.identity.set(user);
  }

  login(returnTo = '/'): void {
    this.auth.loginWithRedirect({ appState: { target: returnTo } });
  }

  signup(): void {
    this.auth.loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } });
  }

  logout(): void {
    this.currentUser = null;
    this.auth.logout({ logoutParams: { returnTo: this.config.authorizationParams?.['redirect_uri'] ?? '' } });
  }

  loadCurrentUser(): Observable<CurrentUser> {
    this.currentUser = null;

    return this.ensureCurrentUser();
  }

  ensureCurrentUser(): Observable<CurrentUser> {
    if (this.currentUser) {
      return of(this.currentUser);
    }

    this.currentUserRequest$ ??= this.fetchCurrentUser().pipe(
      finalize(() => (this.currentUserRequest$ = null)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    return this.currentUserRequest$;
  }

  can(permission: string): boolean {
    return this.currentUser?.status === 'ACTIVE' && this.currentUser.permissions.includes(permission);
  }

  private fetchCurrentUser(): Observable<CurrentUser> {
    return this.identityApi.getCurrentUser().pipe(tap(user => (this.currentUser = user)));
  }
}
