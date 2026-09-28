import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';
import type { Observable } from 'rxjs';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import type { RequestDataAdapter } from '../types';
import { withRequestData } from './with-request-data';

interface TestParams {
  page: number;
}

interface TestData {
  values: number[];
}

const load = vi.fn<(params: TestParams) => Observable<TestData>>(() => of({ values: [] }));
const adapter: RequestDataAdapter<TestData, TestParams> = { load };
const TestRequestStore = signalStore(
  withRequestData<TestData, TestParams>({
    adapter: () => adapter,
    error: 'Load failed',
    isEmpty: data => !data.values.length,
  }),
);

describe('withRequestData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    load.mockReturnValue(of({ values: [] }));
    TestBed.configureTestingModule({ providers: [TestRequestStore] });
  });

  it('loads arbitrary data and exposes the empty UI state', () => {
    const store = TestBed.inject(TestRequestStore);

    store.load({ page: 1 }).subscribe();

    expect(store.data()).toEqual({ values: [] });
    expect(store.requestState()).toEqual({
      resolved: true,
      rejected: false,
      pending: false,
      err: null,
      empty: true,
    });
  });

  it('keeps the latest response and ignores stale data', () => {
    const first = new Subject<TestData>();
    const second = new Subject<TestData>();
    load.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const store = TestBed.inject(TestRequestStore);

    store.load({ page: 1 }, { correlationId: 'first' }).subscribe();
    store.load({ page: 2 }, { correlationId: 'second' }).subscribe();
    second.next({ values: [2] });
    second.complete();
    first.next({ values: [1] });
    first.complete();

    expect(store.data()).toEqual({ values: [2] });
  });

  it('invalidates a pending response on reset', () => {
    const response = new Subject<TestData>();
    load.mockReturnValueOnce(response);
    const store = TestBed.inject(TestRequestStore);

    store.load({ page: 1 }).subscribe();
    store.reset();
    response.next({ values: [1] });
    response.complete();

    expect(store.data()).toBeNull();
    expect(store.loaded()).toBe(false);
    expect(store.loading()).toBe(false);
  });
  it('allocates independent operations for repeated subscriptions', () => {
    const first = new Subject<TestData>();
    const second = new Subject<TestData>();
    load.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const store = TestBed.inject(TestRequestStore);
    const request = store.load({ page: 1 }, { concurrency: 'parallel' });
    const one = request.subscribe();
    const two = request.subscribe();
    expect(Object.keys(store.operations())).toHaveLength(2);
    one.unsubscribe();
    expect(store.loading()).toBe(true);
    two.unsubscribe();
    expect(store.loading()).toBe(false);
  });

  it('preserves data when refresh fails and recovers on retry', () => {
    const store = TestBed.inject(TestRequestStore);
    store.setData({ values: [1] });
    const response = new Subject<TestData>();
    load.mockReturnValueOnce(response);
    store.load({ page: 1 }).subscribe();
    response.error(new Error('Offline'));
    expect(store.requestState()).toMatchObject({ resolved: true, rejected: true, pending: false });
    expect(store.data()).toEqual({ values: [1] });
    store.load({ page: 1 }).subscribe();
    expect(store.error()).toBeNull();
  });

  it('cleans up pending operations when the injector is destroyed', () => {
    const store = TestBed.inject(TestRequestStore);
    const response = new Subject<TestData>();
    load.mockReturnValueOnce(response);
    const next = vi.fn();
    const subscription = store.load({ page: 1 }).subscribe(next);
    TestBed.resetTestingModule();
    expect(subscription.closed).toBe(true);
    response.next({ values: [1] });
    expect(next).not.toHaveBeenCalled();
    expect(store.loading()).toBe(false);
  });

  it('does not forward stale responses to subscribers', () => {
    const response = new Subject<TestData>();
    load.mockReturnValueOnce(response);
    const store = TestBed.inject(TestRequestStore);
    const next = vi.fn();
    store.load({ page: 1 }).subscribe(next);
    store.load({ page: 2 }).subscribe();
    response.next({ values: [1] });
    response.complete();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('withRequestData save adapter', () => {
  const save = vi.fn<(payload: number[]) => Observable<TestData>>();
  const read = vi.fn<() => Observable<TestData>>();
  const WritableStore = signalStore(
    withRequestData<TestData, void, number[]>({
      adapter: () => ({ load: read, save }),
      error: 'Load failed',
      saveError: 'Save failed',
    }),
  );
  beforeEach(() => {
    save.mockReset();
    read.mockReset();
    TestBed.configureTestingModule({ providers: [WritableStore] });
  });

  it('is cold, ignores concurrent writes, and replaces data with the server response', () => {
    const store = TestBed.inject(WritableStore);
    const response = new Subject<TestData>();
    save.mockReturnValue(response);
    const request = store.save([1]);
    expect(save).not.toHaveBeenCalled();
    request.subscribe();
    store.save([2]).subscribe();
    expect(save).toHaveBeenCalledTimes(1);
    expect(store.saving()).toBe(true);
    response.next({ values: [1, 3] });
    expect(store.data()).toEqual({ values: [1, 3] });
    expect(store.loaded()).toBe(true);
    expect(store.saving()).toBe(false);
    expect(read).not.toHaveBeenCalled();
  });

  it('preserves data on failure and supports another save', () => {
    const store = TestBed.inject(WritableStore);
    store.setData({ values: [0] });
    const response = new Subject<TestData>();
    save.mockReturnValueOnce(response).mockReturnValueOnce(of({ values: [2] }));
    store.save([1]).subscribe();
    response.error(new Error('Rejected'));
    expect(store.data()).toEqual({ values: [0] });
    expect(store.error()).toBeNull();
    expect(store.actionError()).toBe('Save failed');
    expect(store.saving()).toBe(false);
    store.save([2]).subscribe();
    expect(store.data()).toEqual({ values: [2] });
    expect(store.actionError()).toBeNull();
  });

  it('cancels stale reads so they cannot overwrite saved data', () => {
    const store = TestBed.inject(WritableStore);
    const old = new Subject<TestData>();
    const duringSave = new Subject<TestData>();
    const response = new Subject<TestData>();
    read.mockReturnValueOnce(old).mockReturnValueOnce(duringSave);
    save.mockReturnValue(response);
    const first = store.load().subscribe();
    store.save([3]).subscribe();
    expect(first.closed).toBe(true);
    const second = store.load().subscribe();
    response.next({ values: [3] });
    expect(second.closed).toBe(true);
    old.next({ values: [1] });
    duringSave.next({ values: [2] });
    expect(store.data()).toEqual({ values: [3] });
  });

  it.each(['reset', 'unsubscribe', 'destroy'] as const)('cleans up a pending save on %s', action => {
    const store = TestBed.inject(WritableStore);
    const response = new Subject<TestData>();
    save.mockReturnValue(response);
    const next = vi.fn();
    const subscription = store.save([1]).subscribe(next);
    if (action === 'reset') {
      store.reset();
    } else if (action === 'destroy') {
      TestBed.resetTestingModule();
    } else {
      subscription.unsubscribe();
    }
    expect(subscription.closed).toBe(true);
    expect(store.saving()).toBe(false);
    response.next({ values: [1] });
    expect(next).not.toHaveBeenCalled();
    expect(store.data()).toBeNull();
  });
});
