import { TestBed } from '@angular/core/testing';

import type { UIStateStatus } from '../../types';
import { UIStateContainerComponent } from './state-container';

const ready: UIStateStatus = { resolved: true, rejected: false, pending: false, err: null };

describe('UIStateContainerComponent', () => {
  it('shows an accessible loading state before data arrives', async () => {
    const fixture = TestBed.createComponent(UIStateContainerComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('[aria-label="Loading data"]')).not.toBeNull();
  });

  it('aggregates named requests and waits for all of them', async () => {
    const fixture = TestBed.createComponent(UIStateContainerComponent);
    fixture.componentRef.setInput('state', { roles: ready, assignments: { ...ready, resolved: false, pending: true } });
    await fixture.whenStable();
    expect(fixture.componentInstance.showPending()).toBe(true);
    expect(fixture.componentInstance.showResolved()).toBe(false);
    fixture.componentRef.setInput('state', { roles: ready, assignments: ready });
    await fixture.whenStable();
    expect(fixture.componentInstance.showResolved()).toBe(true);
  });

  it('keeps resolved content available during refresh and after refresh failure', async () => {
    const fixture = TestBed.createComponent(UIStateContainerComponent);
    fixture.componentRef.setInput('state', [{ ...ready, pending: true }, ready]);
    await fixture.whenStable();
    expect(fixture.componentInstance.showResolved()).toBe(true);
    expect(fixture.nativeElement.querySelector('mat-progress-bar')).not.toBeNull();
    fixture.componentRef.setInput('state', { ...ready, rejected: true, err: 'Refresh failed' });
    await fixture.whenStable();
    expect(fixture.componentInstance.showResolved()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Refresh failed');
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    fixture.nativeElement.querySelector('button').click();
    expect(retry).toHaveBeenCalledOnce();
  });

  it('distinguishes an empty result from an initial failure', async () => {
    const fixture = TestBed.createComponent(UIStateContainerComponent);
    fixture.componentRef.setInput('state', { ...ready, empty: true });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No data found.');
    fixture.componentRef.setInput('state', { ...ready, resolved: false, rejected: true, err: new Error('Offline') });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Offline');
    expect(fixture.nativeElement.textContent).not.toContain('No data found.');
  });

  it('keeps content resolved on an action error and emits dismissal', async () => {
    const fixture = TestBed.createComponent(UIStateContainerComponent);
    fixture.componentRef.setInput('state', ready);
    fixture.componentRef.setInput('actionError', 'Write rejected');
    await fixture.whenStable();
    expect(fixture.componentInstance.showResolved()).toBe(true);
    expect(fixture.componentInstance.showRejected()).toBe(false);
    const dismiss = vi.fn();
    fixture.componentInstance.actionErrorDismissed.subscribe(dismiss);
    fixture.nativeElement.querySelector('button').click();
    expect(dismiss).toHaveBeenCalledOnce();
  });
});
