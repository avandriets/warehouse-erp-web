import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type { Data } from '@angular/router';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { APP_NAVIGATION } from '../../app-navigation.config';
import { NavigationRailComponent, WorkspaceSidebarComponent } from '../../components';
import type { NavigationGroup } from '../../types';

@Component({
  selector: 'erp-layout',
  imports: [RouterOutlet, RouterLink, NavigationRailComponent, WorkspaceSidebarComponent, MatIcon, MatTooltip],
  templateUrl: './app-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly navigationData = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.readNavigationData()),
      startWith(this.readNavigationData()),
    ),
    { requireSync: true },
  );

  readonly sections = APP_NAVIGATION;
  readonly currentSection = computed(
    () => this.sections.find(section => section.id === this.navigationData()['navigationSection']) ?? null,
  );
  readonly activeSection = computed(() => this.currentSection()?.id ?? null);
  readonly selectedItemId = computed<string | null>(() => this.navigationData()['navigationItem'] ?? null);
  readonly sidebarOpen = linkedSignal(() => this.currentSection() !== null);
  readonly sidebarHeading = computed(() => this.currentSection()?.sidebarTitle ?? 'Warehouse ERP');
  readonly sidebarGroups = computed<readonly NavigationGroup[]>(
    () => this.currentSection()?.groups ?? [{ title: 'Sections', items: this.sections }],
  );

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  selectSection(id: string): void {
    const section = this.sections.find(item => item.id === id);
    if (!section) {
      return;
    }

    this.sidebarOpen.set(true);
    void this.router.navigateByUrl(section.route);
  }

  selectItem(id: string): void {
    if (!this.currentSection()) {
      this.selectSection(id);

      return;
    }

    const item = this.currentSection()
      ?.groups.flatMap(group => group.items)
      .find(entry => entry.id === id);
    if (item) {
      void this.router.navigateByUrl(item.route);
    }
  }

  private readNavigationData(): Data {
    let snapshot = this.route.snapshot;
    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }

    return snapshot.data;
  }
}
