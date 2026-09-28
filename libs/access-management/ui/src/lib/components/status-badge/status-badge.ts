import { Component, computed, input } from '@angular/core';
import type { UserStatus } from '@warehouse/shared';
import { USER_STATUS_LABELS } from '@warehouse/shared';

@Component({
  selector: 'am-status-badge',
  templateUrl: './status-badge.html',
})
export class StatusBadge {
  readonly value = input.required<UserStatus | boolean>();
  readonly positive = computed(() => this.value() === true || this.value() === 'ACTIVE');
  readonly label = computed(() => {
    const value = this.value();
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return USER_STATUS_LABELS[value];
  });
}
