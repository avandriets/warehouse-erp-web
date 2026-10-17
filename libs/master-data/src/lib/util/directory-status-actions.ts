import { DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs';

import type { DirectoryStatusActions, DirectoryStatusOptions, DirectoryStatusRecord } from '../types';

export function createDirectoryStatusActions<T extends DirectoryStatusRecord>(
  options: DirectoryStatusOptions<T>,
): DirectoryStatusActions<T> {
  const dialog = inject(MatDialog);
  const injector = inject(Injector);
  const destroyRef = inject(DestroyRef);
  const busy = signal(false);
  const blocked = (record: T): boolean => busy() || options.pending() || !options.canEdit(record);
  const run = (request: Observable<T | undefined>): void => {
    request
      .pipe(
        takeUntilDestroyed(destroyRef),
        finalize(() => busy.set(false)),
      )
      .subscribe(record => {
        if (record) {
          options.accept(record);
        }
      });
  };

  return {
    busy: busy.asReadonly(),
    archive: record => {
      if (blocked(record) || !record.active || options.canArchive?.(record) === false) {
        return;
      }

      busy.set(true);
      run(
        dialog
          .open<unknown, T, T>(options.archiveDialog, {
            data: record,
            width: '480px',
            maxWidth: '95vw',
            injector,
          })
          .afterClosed(),
      );
    },
    restore: record => {
      if (blocked(record) || record.active) {
        return;
      }

      busy.set(true);
      run(options.restore(record));
    },
  };
}
