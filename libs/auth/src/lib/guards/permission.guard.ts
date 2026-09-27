import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { CanActivateFn, UrlTree } from '@angular/router';
import { Router } from '@angular/router';
import type { Observable } from 'rxjs';
import { catchError, filter, map, of, switchMap, take } from 'rxjs';

import { WarehouseAuthService } from '../services';

export const permissionGuard: CanActivateFn = (route, state) => {
  const auth = inject(WarehouseAuthService);
  const router = inject(Router);

  const authorize = (): Observable<boolean | UrlTree> => {
    if (!auth.authenticated()) {
      return of(router.createUrlTree(['/'], { queryParams: { returnTo: state.url } }));
    }

    return auth.loadCurrentUser().pipe(
      map(user =>
        user.status === 'ACTIVE' && (!route.data['permission'] || auth.can(route.data['permission']))
          ? true
          : router.createUrlTree(['/forbidden']),
      ),
      catchError(() => of(router.createUrlTree(['/forbidden']))),
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
