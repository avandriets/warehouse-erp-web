import { NgTemplateOutlet } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import type { UIState, UIStateStatus } from '../../types';

@Component({
  selector: 'ui-state-container',
  imports: [NgTemplateOutlet, MatButtonModule, MatProgressBarModule, MatProgressSpinnerModule],
  templateUrl: './state-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '[attr.aria-busy]': 'isPending()' },
})
export class UIStateContainerComponent {
  readonly state = input<UIState>();
  readonly resolved = input<TemplateRef<unknown>>();
  readonly empty = input<TemplateRef<unknown>>();
  readonly pending = input<TemplateRef<unknown>>();
  readonly rejected = input<TemplateRef<unknown>>();
  readonly updating = input<TemplateRef<unknown>>();
  readonly actionError = input<string | Error | null>();
  readonly actionErrorDismissed = output<void>();
  readonly retry = output<void>();

  private readonly statuses = computed<readonly UIStateStatus[]>(() => {
    const state = this.state();
    if (!state) {
      return [{ resolved: false, rejected: false, pending: true, err: null }];
    }

    return Array.isArray(state) ? state : 'resolved' in state ? [state as UIStateStatus] : Object.values(state);
  });
  private readonly allResolved = computed(() => this.statuses().every(status => status.resolved));

  readonly isPending = computed(() => this.statuses().some(status => status.pending));
  readonly showRejected = computed(() => this.statuses().some(status => status.rejected));
  readonly showEmpty = computed(() => this.allResolved() && this.statuses().some(status => status.empty));
  readonly showResolved = computed(() => this.allResolved() && !this.showEmpty());
  readonly showUpdating = computed(() => this.allResolved() && this.isPending());
  readonly showPending = computed(() => !this.allResolved() && this.isPending());
  readonly errorMessage = computed(() => {
    const error = this.statuses().find(status => status.rejected)?.err;

    return error instanceof Error ? error.message : typeof error === 'string' ? error : 'Could not load data.';
  });
  readonly actionErrorMessage = computed(() => {
    const error = this.actionError();

    return error instanceof Error ? error.message : error;
  });
}
