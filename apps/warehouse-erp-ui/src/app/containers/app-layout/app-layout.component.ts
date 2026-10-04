import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { PrimaryMenuComponent, SubmenuComponent } from '../../components';
import { MenuSelectionService, ShellSessionService } from '../../services';
import type { ResolvedSubmenuGroup } from '../../types';

@Component({
  selector: 'erp-layout',
  imports: [RouterOutlet, RouterLink, PrimaryMenuComponent, SubmenuComponent, MatIcon, MatTooltip],
  templateUrl: './app-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  readonly session = inject(ShellSessionService);
  private readonly router = inject(Router);
  private readonly navigation = inject(MenuSelectionService);

  readonly primaryMenu = this.navigation.primaryMenu;
  readonly currentPrimaryMenuItem = computed(() => this.navigation.selection().primaryMenuItem);
  readonly activePrimaryMenuId = computed(() => this.currentPrimaryMenuItem()?.id ?? null);
  readonly selectedItemId = computed(() => this.navigation.selection().itemId);
  readonly sidebarOpen = linkedSignal(() => this.currentPrimaryMenuItem() !== null);
  readonly sidebarHeading = computed(() => this.currentPrimaryMenuItem()?.sidebarTitle ?? 'Warehouse ERP');
  readonly sidebarGroups = computed<readonly ResolvedSubmenuGroup[]>(
    () => this.currentPrimaryMenuItem()?.groups ?? [{ id: 'primary-menu', title: 'Sections', items: this.primaryMenu }],
  );

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  selectPrimaryMenu(id: string): void {
    const primaryMenuItem = this.primaryMenu.find(item => item.id === id);
    if (!primaryMenuItem) {
      return;
    }

    this.sidebarOpen.set(true);
    void this.router.navigateByUrl(primaryMenuItem.route);
  }
}
