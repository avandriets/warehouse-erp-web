import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import type { NavigationSection } from '../navigation-rail/navigation-rail.component';

interface SidebarItem {
  id: string;
  title: string;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

@Component({
  selector: 'erp-workspace-sidebar',
  standalone: true,
  imports: [MatIconModule, MatMenuModule],
  templateUrl: './workspace-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSidebarComponent {
  readonly section = input.required<NavigationSection>();

  readonly selectedId = signal('stock-overview');

  readonly title = computed(() => {
    switch (this.section()) {
      case 'home':
        return 'Warehouse';

      case 'inventory':
        return 'Inventory';

      case 'purchasing':
        return 'Purchasing';

      case 'sales':
        return 'Sales';

      case 'reports':
        return 'Reports';
      default:
        return '';
    }
  });

  readonly groups = computed<SidebarGroup[]>(() => {
    switch (this.section()) {
      case 'home':
        return [
          {
            title: 'Pinned',
            items: [
              {
                id: 'stock-overview',
                title: 'Stock overview',
              },
              {
                id: 'balances',
                title: 'Current balances',
              },
              {
                id: 'incoming',
                title: 'Incoming shipments',
              },
            ],
          },
          {
            title: 'Modules',
            items: [
              {
                id: 'inventory',
                title: 'Inventory',
              },
              {
                id: 'purchasing',
                title: 'Purchasing',
              },
              {
                id: 'sales',
                title: 'Sales',
              },
              {
                id: 'transfers',
                title: 'Transfers',
              },
            ],
          },
          {
            title: 'Recent',
            items: [
              {
                id: 'receipt-12512',
                title: 'Receipt #12512',
              },
              {
                id: 'transfer-874',
                title: 'Transfer #874',
              },
              {
                id: 'samsung-ssd',
                title: 'Samsung SSD 990 Pro',
              },
              {
                id: 'warehouse-madrid',
                title: 'Warehouse Madrid',
              },
            ],
          },
        ];

      case 'inventory':
        return [
          {
            title: 'Inventory',
            items: [
              {
                id: 'stock-overview',
                title: 'Stock overview',
              },
              {
                id: 'products',
                title: 'Products',
              },
              {
                id: 'warehouses',
                title: 'Warehouses',
              },
              {
                id: 'balances',
                title: 'Balances',
              },
              {
                id: 'movements',
                title: 'Stock movements',
              },
            ],
          },
          {
            title: 'Recent',
            items: [
              {
                id: 'macbook',
                title: 'MacBook Pro 16',
              },
              {
                id: 'ssd',
                title: 'Samsung SSD 990 Pro',
              },
              {
                id: 'madrid',
                title: 'Madrid warehouse',
              },
            ],
          },
        ];

      case 'purchasing':
        return [
          {
            title: 'Purchasing',
            items: [
              {
                id: 'purchase-orders',
                title: 'Purchase orders',
              },
              {
                id: 'suppliers',
                title: 'Suppliers',
              },
              {
                id: 'receipts',
                title: 'Goods receipts',
              },
            ],
          },
        ];

      case 'sales':
        return [
          {
            title: 'Sales',
            items: [
              {
                id: 'sales-orders',
                title: 'Sales orders',
              },
              {
                id: 'customers',
                title: 'Customers',
              },
              {
                id: 'shipments',
                title: 'Shipments',
              },
            ],
          },
        ];

      case 'reports':
        return [
          {
            title: 'Reports',
            items: [
              {
                id: 'inventory-report',
                title: 'Inventory report',
              },
              {
                id: 'movements-report',
                title: 'Movement history',
              },
              {
                id: 'valuation',
                title: 'Stock valuation',
              },
            ],
          },
        ];

      default:
        return [
          {
            title: 'Pinned',
            items: [
              {
                id: 'stock-overview',
                title: 'Stock overview',
              },
              {
                id: 'balances',
                title: 'Current balances',
              },
              {
                id: 'incoming',
                title: 'Incoming shipments',
              },
            ],
          },
          {
            title: 'Modules',
            items: [
              {
                id: 'inventory',
                title: 'Inventory',
              },
              {
                id: 'purchasing',
                title: 'Purchasing',
              },
              {
                id: 'sales',
                title: 'Sales',
              },
              {
                id: 'transfers',
                title: 'Transfers',
              },
            ],
          },
          {
            title: 'Recent',
            items: [
              {
                id: 'receipt-12512',
                title: 'Receipt #12512',
              },
              {
                id: 'transfer-874',
                title: 'Transfer #874',
              },
              {
                id: 'samsung-ssd',
                title: 'Samsung SSD 990 Pro',
              },
              {
                id: 'warehouse-madrid',
                title: 'Warehouse Madrid',
              },
            ],
          },
        ];
    }
  });

  select(id: string): void {
    this.selectedId.set(id);
  }
}
