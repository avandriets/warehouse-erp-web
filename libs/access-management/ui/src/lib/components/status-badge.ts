import { Component, computed, input } from '@angular/core';
import type { UserStatus } from '@warehouse/access-management/util';

@Component({
  selector: 'am-status-badge',
  standalone: true,
  template: `<span
    class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
    [class.bg-emerald-100]="positive()"
    [class.text-emerald-800]="positive()"
    [class.bg-amber-100]="!positive()"
    [class.text-amber-800]="!positive()"
    >{{ label() }}</span
  >`,
})
export class StatusBadge {
  readonly value = input.required<UserStatus | boolean>();
  readonly positive = computed(() => this.value() === true || this.value() === 'ACTIVE');
  readonly label = computed(() => {
    const value = this.value();
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    return (
      {
        INVITED: 'Invited',
        PENDING_APPROVAL: 'Pending approval',
        ACTIVE: 'Active',
        SUSPENDED: 'Suspended',
      } satisfies Record<UserStatus, string>
    )[value];
  });
}
