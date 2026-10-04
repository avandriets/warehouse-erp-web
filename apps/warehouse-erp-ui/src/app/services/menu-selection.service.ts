import type { Signal } from '@angular/core';
import { computed, inject, Injectable } from '@angular/core';
import { isActive, Router } from '@angular/router';

import { PRIMARY_MENU_WITH_SUBMENUS_TOKEN } from '../config/primary-menu-with-submenus.token';
import type { NavigationSelection } from '../types';

@Injectable()
export class MenuSelectionService {
  private readonly router = inject(Router);
  readonly primaryMenu = inject(PRIMARY_MENU_WITH_SUBMENUS_TOKEN);

  private readonly matchers = this.primaryMenu.map(primaryMenuItem => ({
    primaryMenuItem,
    active: this.createMatcher(primaryMenuItem.route, true),
    items: primaryMenuItem.groups.flatMap(group =>
      group.items.map(item => ({
        item,
        active: this.createMatcher(item.route, false),
      })),
    ),
  }));

  readonly selection = computed(() => this.findSelection());

  private findSelection(): NavigationSelection {
    let selection: NavigationSelection = { primaryMenuItem: null, itemId: null };
    let longestMatch = -1;

    for (const matcher of this.matchers) {
      for (const { item, active } of matcher.items) {
        if (item.route.length > longestMatch && active()) {
          longestMatch = item.route.length;
          selection = { primaryMenuItem: matcher.primaryMenuItem, itemId: item.id };
        }
      }
    }
    if (selection.primaryMenuItem) {
      return selection;
    }

    return {
      primaryMenuItem: this.matchers.find(matcher => matcher.active())?.primaryMenuItem ?? null,
      itemId: null,
    };
  }

  private createMatcher(url: string, exact: boolean): Signal<boolean> {
    return isActive(url, this.router, {
      paths: exact ? 'exact' : 'subset',
      queryParams: 'ignored',
      matrixParams: 'ignored',
      fragment: 'ignored',
    });
  }
}
