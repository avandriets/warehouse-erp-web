import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';
import type { Observable } from 'rxjs';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import type { EntityDataAdapter, EntityDataPage } from '../types';
import { withEntityData } from './with-entity-data';

interface TestEntity {
  id: number;
  name: string;
  description?: string;
}

interface TestPayload {
  name: string;
}

interface TestQuery {
  page: number;
}

const firstEntity: TestEntity = { id: 1, name: 'First', description: 'Original' };
const secondEntity: TestEntity = { id: 2, name: 'Second' };

const load = vi.fn((): Observable<EntityDataPage<TestEntity>> => of({ entities: [] }));
const getById = vi.fn((id: number): Observable<TestEntity> => of({ id, name: `Entity ${id}` }));
const create = vi.fn((payload: TestPayload): Observable<TestEntity> => of({ id: 3, ...payload }));
const update = vi.fn((id: number, payload: TestPayload): Observable<TestEntity> => of({ id, ...payload }));
const remove = vi.fn((): Observable<void> => of(undefined));

const adapter: EntityDataAdapter<TestEntity, TestPayload, TestQuery> = {
  load,
  getById,
  create,
  update,
  remove,
};

const TestEntityStore = signalStore(
  withEntityData<TestEntity, TestPayload, TestQuery>({
    adapter: () => adapter,
    errors: {
      load: 'Load failed',
      getById: 'Get failed',
      create: 'Create failed',
      update: 'Update failed',
      remove: 'Remove failed',
    },
  }),
);

describe('withEntityData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    load.mockImplementation(() => of({ entities: [] }));
    getById.mockImplementation(id => of({ id, name: `Entity ${id}` }));
    create.mockImplementation(payload => of({ id: 3, ...payload }));
    update.mockImplementation((id, payload) => of({ id, ...payload }));
    remove.mockImplementation(() => of(undefined));
    TestBed.configureTestingModule({ providers: [TestEntityStore] });
  });

  it('keeps the latest load result and ignores a stale response', () => {
    const firstResponse = new Subject<EntityDataPage<TestEntity>>();
    const secondResponse = new Subject<EntityDataPage<TestEntity>>();
    load.mockReturnValueOnce(firstResponse).mockReturnValueOnce(secondResponse);
    const store = TestBed.inject(TestEntityStore);

    store.load({ page: 1 }, { correlationId: 'load-1' }).subscribe();
    store.load({ page: 2 }, { correlationId: 'load-2' }).subscribe();

    secondResponse.next({ entities: [secondEntity] });
    secondResponse.complete();
    firstResponse.next({ entities: [firstEntity] });
    firstResponse.complete();

    expect(store.entities()).toEqual([secondEntity]);
    expect(store.loadOperations()['load-2']).toEqual({
      correlationId: 'load-2',
      type: 'load',
      status: 'success',
      error: null,
    });
  });

  it('invalidates pending operations when the store is reset', () => {
    const response = new Subject<EntityDataPage<TestEntity>>();
    load.mockReturnValueOnce(response);
    const store = TestBed.inject(TestEntityStore);

    store.load({ page: 1 }).subscribe();
    store.reset();
    response.next({ entities: [firstEntity] });
    response.complete();

    expect(store.entities()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.loaded()).toBe(false);
  });

  it('supports exhaust and parallel load concurrency', () => {
    const firstResponse = new Subject<EntityDataPage<TestEntity>>();
    const secondResponse = new Subject<EntityDataPage<TestEntity>>();
    load.mockReturnValueOnce(firstResponse).mockReturnValueOnce(secondResponse);
    const store = TestBed.inject(TestEntityStore);

    store.load({ page: 1 }, { concurrency: 'exhaust', merge: 'append' }).subscribe();
    store.load({ page: 2 }, { concurrency: 'exhaust' }).subscribe();
    expect(load).toHaveBeenCalledTimes(1);

    store.load({ page: 2 }, { concurrency: 'parallel', correlationId: 'parallel-2', merge: 'append' }).subscribe();
    expect(load).toHaveBeenCalledTimes(2);
    expect(store.loading()).toBe(true);

    secondResponse.next({ entities: [secondEntity] });
    secondResponse.complete();
    firstResponse.next({ entities: [firstEntity] });
    firstResponse.complete();

    expect(store.loading()).toBe(false);
    expect(store.entities()).toEqual([secondEntity, firstEntity]);
  });

  it('supports replace, append, prepend and upsert merge strategies with pagination', () => {
    const store = TestBed.inject(TestEntityStore);

    load.mockReturnValueOnce(of({ entities: [firstEntity] }));
    store.load({ page: 1 }).subscribe();

    load.mockReturnValueOnce(of({ entities: [secondEntity], pagination: { total: 4, nextCursor: 'next' } }));
    store.load({ page: 2 }, { merge: 'append' }).subscribe();
    expect(store.pagination()).toEqual({ total: 4, nextCursor: 'next' });

    const thirdEntity: TestEntity = { id: 3, name: 'Third' };
    const fourthEntity: TestEntity = { id: 4, name: 'Fourth' };
    load.mockReturnValueOnce(of({ entities: [thirdEntity, fourthEntity] }));
    store.load({ page: 0 }, { merge: 'prepend' }).subscribe();

    load.mockReturnValueOnce(of({ entities: [{ id: 1, name: 'Updated' }] }));
    store.load({ page: 1 }, { merge: 'upsert' }).subscribe();

    expect(store.entities()).toEqual([thirdEntity, fourthEntity, { ...firstEntity, name: 'Updated' }, secondEntity]);
    expect(store.pagination()).toEqual({});
  });

  it('replaces the complete collection without a remote load', () => {
    const store = TestBed.inject(TestEntityStore);

    store.upsertMany([firstEntity, secondEntity]);
    store.replaceAll([secondEntity]);

    expect(store.entities()).toEqual([secondEntity]);
    expect(store.loaded()).toBe(true);
    expect(store.pagination()).toEqual({});
  });

  it('tracks the latest operation independently for each entity', () => {
    const firstUpdate = new Subject<TestEntity>();
    const secondUpdate = new Subject<TestEntity>();
    update.mockReturnValueOnce(firstUpdate).mockReturnValueOnce(secondUpdate);
    const store = TestBed.inject(TestEntityStore);
    store.upsert(firstEntity);

    store.update({ id: 1, payload: { name: 'Stale' } }, { correlationId: 'update-1' }).subscribe();
    store.update({ id: 1, payload: { name: 'Latest' } }, { correlationId: 'update-2' }).subscribe();

    expect(store.entityOperations()[1]).toEqual({
      correlationId: 'update-2',
      type: 'update',
      status: 'pending',
      error: null,
    });
    expect(store.isEntityPending(1)).toBe(true);

    secondUpdate.next({ id: 1, name: 'Latest' });
    secondUpdate.complete();
    firstUpdate.next({ id: 1, name: 'Stale' });
    firstUpdate.complete();

    expect(store.entityById(1)?.name).toBe('Latest');
    expect(store.operationById(1)?.status).toBe('success');
  });

  it('gets one entity and exposes it from the normalized collection', () => {
    const store = TestBed.inject(TestEntityStore);

    store.getById(2, { correlationId: 'get-2' }).subscribe();

    expect(getById).toHaveBeenCalledTimes(1);
    expect(store.entityById(2)).toEqual({ id: 2, name: 'Entity 2' });
    expect(store.entityOperations()[2]).toEqual({
      correlationId: 'get-2',
      type: 'getById',
      status: 'success',
      error: null,
    });
  });

  it('supports atomic local upsert and bulk operations', () => {
    const store = TestBed.inject(TestEntityStore);

    store.upsert(firstEntity);
    store.upsertMany([{ id: 1, name: 'Merged' }, secondEntity]);
    expect(store.entities()).toEqual([{ ...firstEntity, name: 'Merged' }, secondEntity]);

    store.removeMany([1]);
    expect(store.entities()).toEqual([secondEntity]);

    store.clear();
    expect(store.entities()).toEqual([]);
  });
  it('keeps the collection visible when a write fails', () => {
    const store = TestBed.inject(TestEntityStore);
    store.replaceAll([firstEntity]);
    const response = new Subject<TestEntity>();
    update.mockReturnValueOnce(response);
    store.update({ id: 1, payload: { name: 'Rejected' } }).subscribe();
    response.error(new Error('Conflict'));
    expect(store.entities()).toEqual([firstEntity]);
    expect(store.actionError()).toBe('Update failed');
    expect(store.entityState()).toMatchObject({ resolved: true, rejected: false });
    expect(store.saving()).toBe(false);
  });

  it('clears pending create state on unsubscribe', () => {
    const response = new Subject<TestEntity>();
    create.mockReturnValueOnce(response);
    const store = TestBed.inject(TestEntityStore);
    const subscription = store.create({ name: 'Cancelled' }).subscribe();
    expect(store.saving()).toBe(true);
    subscription.unsubscribe();
    expect(store.saving()).toBe(false);
  });
});
