import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export type NavigationSection = 'home' | 'inventory' | 'purchasing' | 'sales' | 'reports';

@Component({
  selector: 'erp-navigation-rail',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  templateUrl: './navigation-rail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationRailComponent {
  readonly activeSection = input.required<NavigationSection>();
  readonly sidebarOpen = input.required<boolean>();

  readonly sectionChange = output<NavigationSection>();
  readonly sidebarToggle = output<void>();
}
