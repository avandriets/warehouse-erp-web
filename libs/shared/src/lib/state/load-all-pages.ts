import type { Observable } from 'rxjs';
import { defer, EMPTY, expand, reduce, throwError } from 'rxjs';

/** Load every reference page once; consumers filter the resulting snapshot locally. */
export function loadAllPages<T>(
  fetch: (offset: number, limit: number) => Observable<{ items: T[]; total: number }>,
): Observable<T[]> {
  const limit = 100;

  return defer(() => fetch(0, limit)).pipe(
    expand((page, index) => {
      if (index * limit + page.items.length >= page.total) {
        return EMPTY;
      }

      if (page.items.length !== limit) {
        return throwError(() => new Error('The reference list is incomplete. Reload to try again.'));
      }

      return fetch((index + 1) * limit, limit);
    }),
    reduce((items, page) => [...items, ...page.items], [] as T[]),
  );
}
