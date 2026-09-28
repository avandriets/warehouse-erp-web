import { TestBed } from '@angular/core/testing';
import { signalStore, withState } from '@ngrx/signals';
import { expectTypeOf } from 'vitest';

import { withCallState } from './with-call-state';

const TestStore = signalStore(
  withState({ items: ['preserved'] }),
  withCallState({ collection: 'catalog' }),
  withCallState({ collection: 'assignments' }),
);

describe('withCallState', () => {
  let store: InstanceType<typeof TestStore>;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TestStore] });
    store = TestBed.inject(TestStore);
  });

  it('provides typed, independent named signals and methods', () => {
    expectTypeOf(store.catalogLoading()).toEqualTypeOf<boolean>();
    expectTypeOf(store.catalogError()).toEqualTypeOf<string | null>();
    expectTypeOf(store.catalogStartCall).parameter(0).toEqualTypeOf<'load' | 'save'>();
    expect(store.catalogState()).toEqual({ resolved: false, pending: false, rejected: false, err: null });
    store.catalogStartCall('load');
    store.assignmentsStartCall('save');
    expect(store.catalogLoading()).toBe(true);
    expect(store.catalogSaving()).toBe(false);
    expect(store.assignmentsLoading()).toBe(false);
    expect(store.assignmentsSaving()).toBe(true);
  });

  it('keeps a successful request busy until finalization', () => {
    store.catalogStartCall('load');
    store.catalogCallSucceeded('load');
    expect(store.catalogLoaded()).toBe(true);
    expect(store.catalogLoading()).toBe(true);
    store.catalogFinishCall('load');
    expect(store.catalogState()).toEqual({ resolved: true, pending: false, rejected: false, err: null });
  });

  it('distinguishes initial failure from refresh failure and clears errors on retry', () => {
    store.catalogStartCall('load');
    store.catalogCallFailed('load', 'Unavailable');
    store.catalogFinishCall('load');
    expect(store.catalogState()).toEqual({ resolved: false, pending: false, rejected: true, err: 'Unavailable' });
    store.catalogStartCall('load');
    expect(store.catalogError()).toBeNull();
    store.catalogCallSucceeded('load');
    store.catalogFinishCall('load');
    store.catalogStartCall('load');
    store.catalogCallFailed('load', 'Refresh failed');
    store.catalogFinishCall('load');
    expect(store.catalogState()).toEqual({ resolved: true, pending: false, rejected: true, err: 'Refresh failed' });
  });

  it('keeps write errors separate from read errors and preserves loaded state', () => {
    store.assignmentsSetLoaded();
    store.assignmentsStartCall('load');
    store.assignmentsCallFailed('load', 'Read failed');
    store.assignmentsFinishCall('load');
    store.assignmentsStartCall('save');
    store.assignmentsCallFailed('save', 'Write failed');
    store.assignmentsFinishCall('save');
    expect(store.assignmentsLoaded()).toBe(true);
    expect(store.assignmentsError()).toBe('Read failed');
    expect(store.assignmentsActionError()).toBe('Write failed');
    expect(store.assignmentsSaving()).toBe(false);
    store.assignmentsDismissActionError();
    expect(store.assignmentsActionError()).toBeNull();
    expect(store.assignmentsError()).toBe('Read failed');
    store.assignmentsStartCall('save');
    store.assignmentsCallSucceeded('save');
    store.assignmentsFinishCall('save');
    expect(store.items()).toEqual(['preserved']);
  });

  it('does not claim that an incremental write loaded the complete resource', () => {
    store.assignmentsStartCall('save');
    store.assignmentsCallSucceeded('save');
    store.assignmentsFinishCall('save');
    expect(store.assignmentsLoaded()).toBe(false);
    store.assignmentsSetLoaded();
    expect(store.assignmentsLoaded()).toBe(true);
  });

  it('finishes cancelled requests without declaring success', () => {
    store.catalogStartCall('load');
    store.catalogFinishCall('load');
    store.assignmentsStartCall('save');
    store.assignmentsFinishCall('save');
    expect(store.catalogLoaded()).toBe(false);
    expect(store.catalogLoading()).toBe(false);
    expect(store.assignmentsSaving()).toBe(false);
    expect(store.assignmentsLoaded()).toBe(false);
  });

  it('resets only the selected call state without modifying domain data', () => {
    store.catalogSetLoaded();
    store.catalogStartCall('save');
    store.catalogCallFailed('save', 'Failed');
    store.assignmentsStartCall('load');
    store.catalogResetCallState();
    expect(store.catalogCallState()).toEqual({
      loaded: false,
      loading: false,
      saving: false,
      error: null,
      actionError: null,
    });
    expect(store.assignmentsLoading()).toBe(true);
    expect(store.items()).toEqual(['preserved']);
  });
});
