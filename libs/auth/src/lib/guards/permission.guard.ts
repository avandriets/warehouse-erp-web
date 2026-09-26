import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { catchError, filter, map, of, switchMap, take } from 'rxjs';

import { WarehouseAuth } from '../services';

export const permissionGuard: CanActivateFn = (route, state) => {
  const auth = inject(WarehouseAuth);
  const router = inject(Router);

  return auth.isLoading$.pipe(
    filter(loading => !loading),
    take(1),
    switchMap(() => auth.isAuthenticated$.pipe(take(1))),
    switchMap(loggedIn => {
      if (!loggedIn) return of(router.createUrlTree(['/login'], { queryParams: { returnTo: state.url } }));

      return auth.loadUser().pipe(
        map(user => (user.status === 'ACTIVE' && (!route.data['permission'] || auth.can(route.data['permission'])) ? true : router.createUrlTree(['/forbidden']))),
        catchError(() => of(router.createUrlTree(['/forbidden']))),
      );
    }),
  );
};
