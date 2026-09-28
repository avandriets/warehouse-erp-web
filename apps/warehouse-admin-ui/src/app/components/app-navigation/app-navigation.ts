import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';

import type { NavigationSection } from '../../types';

@Component({
  selector: 'app-navigation',
  imports: [NgTemplateOutlet, MatButtonModule, MatTooltipModule, MatListModule, RouterLink, RouterLinkActive],
  templateUrl: './app-navigation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppNavigation {
  readonly navigation = input.required<readonly NavigationSection[]>();
  readonly collapsed = input(false);
  readonly collapsible = input(true);
  readonly collapseToggle = output<void>();
  readonly sectionSelected = output<void>();
  readonly closedGroups = signal<ReadonlySet<string>>(new Set());

  toggleGroup(id: string): void {
    this.closedGroups.update(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }
}
