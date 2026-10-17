import type { ComponentType } from '@angular/cdk/portal';
import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';

export interface DirectoryStatusRecord {
  id: string;
  active: boolean;
}

export interface DirectoryStatusOptions<T extends DirectoryStatusRecord> {
  pending: () => boolean;
  canEdit: (record: T) => boolean;
  canArchive?: (record: T) => boolean;
  archiveDialog: ComponentType<unknown>;
  restore: (record: T) => Observable<T>;
  accept: (record: T) => void;
}

export interface DirectoryStatusActions<T extends DirectoryStatusRecord> {
  busy: Signal<boolean>;
  archive: (record: T) => void;
  restore: (record: T) => void;
}
