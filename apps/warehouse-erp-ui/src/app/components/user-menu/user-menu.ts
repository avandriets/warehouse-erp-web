import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'erp-user-menu',
  imports: [MatDivider, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, MatTooltip],
  templateUrl: './user-menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenuComponent {
  readonly userName = input.required<string>();
  readonly email = input<string | null>(null);
  readonly signOut = output<void>();

  readonly initials = computed(() => {
    const words = this.userName().trim().split(/\s+/).filter(Boolean);
    const first = Array.from(words[0] ?? '')[0] ?? '';
    const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? '') : '';

    return (first + last).toLocaleUpperCase() || '?';
  });
}
