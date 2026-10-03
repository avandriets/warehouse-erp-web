import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';

import type { NavigationSection } from '../../components';
import { NavigationRailComponent, WorkspaceSidebarComponent } from '../../components';

@Component({
  selector: 'erp-layout',
  imports: [RouterOutlet, NavigationRailComponent, WorkspaceSidebarComponent],
  templateUrl: './app-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  readonly auth = inject(WarehouseAuthService);

  readonly activeSection = signal<NavigationSection>('home');
  readonly sidebarOpen = signal(true);

  login(): void {
    this.auth.login('/');
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  selectSection(section: NavigationSection): void {
    this.activeSection.set(section);

    if (!this.sidebarOpen()) {
      this.sidebarOpen.set(true);
    }
  }
}
