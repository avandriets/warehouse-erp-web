import type { OnChanges } from '@angular/core';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccessManagementApi, accessManagementError } from '@warehouse/access-management/data-access';
import type { PermissionRecord, RoleRecord } from '@warehouse/access-management/util';

@Component({
  selector: 'am-role-permissions',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatCardModule, MatCheckboxModule, MatProgressSpinnerModule],
  template: `<mat-card appearance="outlined" class="mt-6">
    <mat-card-header class="items-start justify-between">
      <mat-card-title>{{ role().name }}</mat-card-title>
      <button mat-stroked-button type="button" (click)="closed.emit()" [disabled]="busy()">Close</button>
    </mat-card-header>
    <mat-card-content class="pt-5!">
      @if (error()) {
        <p class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{{ error() }}</p>
      }
      @if (notice()) {
        <p class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{{ notice() }}</p>
      }
      @if (loading()) {
        <div class="flex min-h-32 items-center justify-center gap-3 text-sm text-stone-600" role="status"><mat-spinner diameter="28" /> Loading permissions…</div>
      } @else if (ready()) {
        <form (ngSubmit)="save()">
          <fieldset>
            <legend class="mb-4 font-semibold text-stone-900">Role permissions</legend>
            <div class="grid gap-3 md:grid-cols-2">
              @for (permission of permissions; track permission.code) {
                <mat-checkbox [name]="permission.code" [(ngModel)]="selected[permission.code]" [disabled]="busy()">
                  <span class="font-semibold">{{ permission.code }}</span>
                  <span class="block text-xs text-stone-600">{{ permission.description }}</span>
                </mat-checkbox>
              }
            </div>
          </fieldset>
          <button mat-flat-button class="mt-6" [disabled]="busy()">Save permissions</button>
        </form>
      } @else {
        <button mat-flat-button type="button" (click)="load()">Retry</button>
      }
    </mat-card-content>
  </mat-card>`,
})
export class RolePermissions implements OnChanges {
  private readonly api = inject(AccessManagementApi);
  readonly role = input.required<RoleRecord>();
  readonly closed = output<void>();
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly ready = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  permissions: PermissionRecord[] = [];
  selected: Record<string, boolean> = {};

  ngOnChanges(): void {
    this.notice.set('');
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.ready.set(false);
    this.error.set('');
    try {
      const [all, assigned] = await Promise.all([this.api.listPermissions(), this.api.listRolePermissions(this.role().id)]);
      this.permissions = all;
      this.selected = Object.fromEntries(all.map(permission => [permission.code, assigned.some(item => item.code === permission.code)]));
      this.ready.set(true);
    } catch (error) {
      this.error.set(accessManagementError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.replaceRolePermissions(
        this.role().id,
        Object.keys(this.selected).filter(code => this.selected[code]),
      );
      await this.load();
      this.notice.set('Changes saved.');
    } catch (error) {
      this.error.set(accessManagementError(error));
    } finally {
      this.busy.set(false);
    }
  }
}
