import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AccessManagementApi, accessManagementError } from '@warehouse/access-management/data-access';
import { StatusBadge } from '@warehouse/access-management/ui';
import type { RoleCreate, RoleRecord, RoleUpdate } from '@warehouse/access-management/util';

import { RolePermissions } from '../components';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    RolePermissions,
    StatusBadge,
  ],
  templateUrl: './roles.html',
})
export class RolesPage {
  private readonly api = inject(AccessManagementApi);
  private requestId = 0;
  readonly roles = signal<RoleRecord[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly editor = signal(false);
  readonly selected = signal<RoleRecord | null>(null);
  readonly displayedColumns = ['code', 'name', 'active', 'actions'];
  filter: '' | 'true' | 'false' = '';
  query = '';
  editing: RoleRecord | null = null;
  model = { code: '', name: '', description: '', active: true };

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    const request = ++this.requestId;
    this.loading.set(true);
    this.error.set('');
    try {
      const roles = await this.api.listRoles(this.filter ? this.filter === 'true' : undefined);
      if (request === this.requestId) this.roles.set(roles);
    } catch (error) {
      if (request === this.requestId) this.error.set(accessManagementError(error));
    } finally {
      if (request === this.requestId) this.loading.set(false);
    }
  }

  visibleRoles(): RoleRecord[] {
    const query = this.query.trim().toLowerCase();
    if (!query) return this.roles();

    return this.roles().filter(role => [role.code, role.name, role.description].some(value => value?.toLowerCase().includes(query)));
  }

  open(role: RoleRecord | null = null): void {
    this.error.set('');
    this.notice.set('');
    this.editing = role;
    this.model = {
      code: role?.code ?? '',
      name: role?.name ?? '',
      description: role?.description ?? '',
      active: role?.active ?? true,
    };
    this.selected.set(null);
    this.editor.set(true);
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      if (this.editing) {
        const payload: RoleUpdate = {
          name: this.model.name.trim(),
          description: this.model.description.trim() || null,
          active: this.model.active,
        };
        await this.api.updateRole(this.editing.id, payload);
      } else {
        const payload: RoleCreate = {
          code: this.model.code.trim(),
          name: this.model.name.trim(),
          description: this.model.description.trim() || null,
        };
        await this.api.createRole(payload);
      }
      this.editor.set(false);
      await this.load();
      this.notice.set('Changes saved.');
    } catch (error) {
      this.error.set(accessManagementError(error));
    } finally {
      this.saving.set(false);
    }
  }

  changeFilter(): void {
    void this.load();
  }
}
