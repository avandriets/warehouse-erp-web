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
