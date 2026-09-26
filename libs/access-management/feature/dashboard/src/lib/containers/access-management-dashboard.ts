import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [MatButtonModule, MatCardModule, RouterLink],
  template: `<header>
      <p class="mb-2 text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase">Access management</p>
      <h1 class="m-0 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">Users and permissions</h1>
      <p class="mt-3 text-sm leading-6 text-stone-600">Manage ERP users, roles, and effective access from one workspace.</p>
    </header>
    <div class="mt-8 grid gap-5 md:grid-cols-2">
      @for (item of entries; track item.path) {
        <mat-card appearance="outlined" class="min-h-44">
          <mat-card-header
            ><mat-card-title>{{ item.title }}</mat-card-title></mat-card-header
          >
          <mat-card-content class="pt-3!">
            <p class="m-0 text-sm leading-6 text-stone-600">{{ item.description }}</p>
          </mat-card-content>
          <mat-card-actions class="mt-auto px-4! pb-4!">
            <a mat-button [routerLink]="item.path">Open section</a>
          </mat-card-actions>
        </mat-card>
      }
    </div>`,
})
export class AccessManagementDashboard {
  readonly entries = [
    { path: 'users', title: 'Users', description: 'Employee accounts, Auth0 links, statuses, and role assignments.' },
    { path: 'roles', title: 'Roles and permissions', description: 'Permission sets that define access to ERP capabilities.' },
  ];
}
