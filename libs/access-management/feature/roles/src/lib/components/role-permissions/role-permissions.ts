import type { OnChanges } from '@angular/core';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccessManagementApiService, accessManagementError } from '@warehouse/access-management/data-access';
import type { PermissionRecord, RoleRecord } from '@warehouse/access-management/util';

@Component({
  selector: 'am-role-permissions',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatCardModule, MatCheckboxModule, MatProgressSpinnerModule],
  templateUrl: './role-permissions.html',
})
export class RolePermissions implements OnChanges {
  private readonly api = inject(AccessManagementApiService);
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
      const [all, assigned] = await Promise.all([
        this.api.listPermissions(),
        this.api.listRolePermissions(this.role().id),
      ]);
      this.permissions = all;
      this.selected = Object.fromEntries(
        all.map(permission => [permission.code, assigned.some(item => item.code === permission.code)]),
      );
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
