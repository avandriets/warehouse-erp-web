import { inject, InjectionToken, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { Observable } from 'rxjs';
import { of, Subject, throwError } from 'rxjs';

import type { EntityDataFailure, EntityDataPage, EntityDataSuccess } from '../types';
import { withEntityData } from './with-entity-data';
import { withEntityNotifications } from './with-entity-notifications';

interface TestRecord {
  id: number;
  name: string;
}

const record: TestRecord = { id: 1, name: 'Item' };
const message = new InjectionToken<string | null>('Test created message', { factory: () => 'Created' });
const load = vi.fn<() => Observable<EntityDataPage<TestRecord>>>();
const create = vi.fn<() => Observable<TestRecord>>();
const updated = vi.fn<() => Observable<TestRecord>>();
const notificationEvents = eventGroup({
  source: 'Test entity notifications',
  events: {
    loadFailed: type<EntityDataFailure>(),
    createFailed: type<EntityDataFailure>(),
    updateFailed: type<EntityDataFailure>(),
    created: type<EntityDataSuccess<TestRecord>>(),
    updated: type<EntityDataSuccess<TestRecord>>(),
    removed: type<EntityDataSuccess<number | string>>(),
  },
});
const NotificationStore = signalStore(
  withEntityData<TestRecord, { name: string }, void>({
    adapter: () => ({ load, create, update: updated, remove: () => of(undefined) }),
    events: notificationEvents,
    errors: { load: 'Read failed', create: 'Create failed', update: 'Write failed', remove: 'Delete failed' },
  }),
  withEntityNotifications(notificationEvents, () => ({
    created: inject(message),
    updated: 'Saved',
    removed: 'Deleted',
  })),
);

describe('entity event notifications', () => {
  const snack = { open: vi.fn() };
  beforeEach(() => {
    snack.open.mockClear();
    load.mockReset().mockReturnValue(of({ entities: [] }));
    create.mockReset().mockReturnValue(of(record));
    updated.mockReset().mockReturnValue(of(record));
    TestBed.configureTestingModule({ providers: [NotificationStore, { provide: MatSnackBar, useValue: snack }] });
  });

  it('notifies once with multiple store instances listening to the same events', () => {
    const owner = TestBed.inject(NotificationStore);
    const scope = Injector.create({ parent: TestBed.inject(Injector), providers: [NotificationStore] });
    try {
      const other = scope.get(NotificationStore);
      owner.create({ name: 'Item' }, { correlationId: 'owned' }).subscribe();
      expect(owner.ownsRequest('owned')).toBe(true);
      expect(other.ownsRequest('owned')).toBe(false);
      expect(snack.open).toHaveBeenCalledExactlyOnceWith('Created', 'Dismiss', { duration: 4000 });
      snack.open.mockClear();
      other.update({ id: 1, payload: { name: 'Updated' } }).subscribe();
      expect(snack.open).toHaveBeenCalledExactlyOnceWith('Saved', 'Dismiss', { duration: 4000 });
      snack.open.mockClear();
      owner.remove(1).subscribe();
      expect(snack.open).toHaveBeenCalledExactlyOnceWith('Deleted', 'Dismiss', { duration: 4000 });
    } finally {
      scope.destroy();
    }
  });

  it('reports failures through the owning instance, with no success notification', () => {
    const owner = TestBed.inject(NotificationStore);
    const scope = Injector.create({ parent: TestBed.inject(Injector), providers: [NotificationStore] });
    try {
      scope.get(NotificationStore);
      create.mockReturnValueOnce(throwError(() => new Error('No')));
      owner.create({ name: 'Item' }).subscribe();
      expect(snack.open).toHaveBeenCalledExactlyOnceWith('Create failed', 'Dismiss', { duration: 6000 });
      snack.open.mockClear();
      load.mockReturnValueOnce(throwError(() => new Error('Offline')));
      owner.load().subscribe();
      expect(snack.open).toHaveBeenCalledExactlyOnceWith('Read failed', 'Dismiss', { duration: 6000 });
    } finally {
      scope.destroy();
    }
  });

  it('ignores cancelled and reset requests, and permits a disabled success message', () => {
    const store = TestBed.inject(NotificationStore);
    const pending = new Subject<TestRecord>();
    create.mockReturnValueOnce(pending);
    const request = store.create({ name: 'Item' }, { correlationId: 'cancelled' }).subscribe();
    request.unsubscribe();
    expect(store.ownsRequest('cancelled')).toBe(false);
    pending.next(record);
    pending.complete();
    expect(snack.open).not.toHaveBeenCalled();
    store.reset();
    expect(store.ownsRequest('cancelled')).toBe(false);
    const scope = Injector.create({
      parent: TestBed.inject(Injector),
      providers: [NotificationStore, { provide: message, useValue: null }],
    });
    try {
      scope.get(NotificationStore).create({ name: 'Item' }).subscribe();
      expect(snack.open).not.toHaveBeenCalled();
    } finally {
      scope.destroy();
    }
  });
});
