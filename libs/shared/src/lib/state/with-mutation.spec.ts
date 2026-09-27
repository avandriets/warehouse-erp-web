import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';

import { withMutation } from './with-mutation';

const MutationStore = signalStore(withMutation(() => 'Write failed'));

describe('withMutation', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [MutationStore] }));

  it('distinguishes a successful void response from failure', async () => {
    const store = TestBed.inject(MutationStore);
    expect(await firstValueFrom(store.mutate(() => of(undefined)))).toEqual({ data: undefined });
    expect(
      await firstValueFrom(
        store.mutate(() => throwError(() => new Error('Conflict'))),
        { defaultValue: undefined },
      ),
    ).toBeUndefined();
    expect(store.actionError()).toBe('Write failed');
    expect(store.saving()).toBe(false);
  });

  it('starts only on subscription and cancels the source on unsubscribe', () => {
    const store = TestBed.inject(MutationStore);
    const source = new Subject<string>();
    const action = vi.fn(() => source);
    const request = store.mutate(action);
    expect(action).not.toHaveBeenCalled();
    expect(store.saving()).toBe(false);
    const subscription = request.subscribe();
    expect(store.saving()).toBe(true);
    expect(source.observed).toBe(true);
    subscription.unsubscribe();
    expect(source.observed).toBe(false);
    expect(store.saving()).toBe(false);
  });

  it('cancels an invalidated write without clearing the new write state', async () => {
    const store = TestBed.inject(MutationStore);
    const firstSource = new Subject<string>();
    const secondSource = new Subject<string>();
    const first = firstValueFrom(
      store.mutate(() => firstSource),
      { defaultValue: undefined },
    );
    store.resetMutation();
    expect(firstSource.observed).toBe(false);
    const second = firstValueFrom(store.mutate(() => secondSource));
    firstSource.next('stale');
    expect(await first).toBeUndefined();
    expect(store.saving()).toBe(true);
    secondSource.next('current');
    expect(await second).toEqual({ data: 'current' });
    expect(store.saving()).toBe(false);
  });

  it('unsubscribes on destruction without reporting an error', async () => {
    const store = TestBed.inject(MutationStore);
    const source = new Subject<string>();
    const result = firstValueFrom(
      store.mutate(() => source),
      { defaultValue: undefined },
    );
    TestBed.resetTestingModule();
    expect(source.observed).toBe(false);
    expect(await result).toBeUndefined();
    expect(store.saving()).toBe(false);
    expect(store.actionError()).toBeNull();
  });
});
