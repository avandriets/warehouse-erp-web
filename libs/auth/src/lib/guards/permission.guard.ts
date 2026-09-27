import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { CanActivateFn, UrlTree } from '@angular/router';
import { RedirectCommand, Router } from '@angular/router';
import type { Observable } from 'rxjs';
import { catchError, filter, map, of, switchMap, take } from 'rxjs';

import { WarehouseAuthService } from '../services';

export const permissionGuard: CanActivateFn = (route, state) => {
  const auth = inject(WarehouseAuthService);
  const router = inject(Router);

  const errorRedirect = (status: 401 | 403 | 503): RedirectCommand =>
    new RedirectCommand(
      router.createUrlTree(['/error'], {
        queryParams: { status, returnTo: state.url },
      }),
      { skipLocationChange: true },
    );

  const authorize = (): Observable<boolean | UrlTree | RedirectCommand> => {
    if (!auth.authenticated()) {
      return of(errorRedirect(401));
    }

    return auth.ensureCurrentUser().pipe(
      map(user =>
        user.status === 'ACTIVE' && (!route.data['permission'] || auth.can(route.data['permission']))
          ? true
          : errorRedirect(403),
      ),
      catchError(() => of(errorRedirect(503))),
    );
  };

  if (!auth.loading()) {
    return authorize();
  }

  return toObservable(auth.loading).pipe(
    filter(loading => !loading),
    take(1),
    switchMap(authorize),
  );
};
