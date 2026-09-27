import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AccessManagementApiService, accessManagementError } from '@warehouse/access-management/data-access';
import { StatusBadge } from '@warehouse/access-management/ui';
import type { UserRecord, UserStatus, UserWrite } from '@warehouse/access-management/util';

import { UserAccess } from '../../components';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    StatusBadge,
    UserAccess,
  ],
  templateUrl: './users.html',
})
export class UsersPage {
  private readonly api = inject(AccessManagementApiService);
  private requestId = 0;
  readonly users = signal<UserRecord[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly editor = signal(false);
  readonly selected = signal<UserRecord | null>(null);
  readonly displayedColumns = ['display_name', 'email', 'status', 'actions'];
  readonly pageSize = 25;
  offset = 0;
  filter: UserStatus | '' = '';
  query = '';
  editing: UserRecord | null = null;
  model = { email: '', display_name: '' };

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    const request = ++this.requestId;
    this.loading.set(true);
    this.error.set('');
    try {
      const users = await this.api.listUsers(this.pageSize, this.offset, this.filter || undefined);
      if (request === this.requestId) this.users.set(users);
    } catch (error) {
      if (request === this.requestId) this.error.set(accessManagementError(error));
    } finally {
      if (request === this.requestId) this.loading.set(false);
    }
  }

  visibleUsers(): UserRecord[] {
    const query = this.query.trim().toLowerCase();
    if (!query) return this.users();

    return this.users().filter(user =>
      [user.display_name, user.email, user.status].some(value => value?.toLowerCase().includes(query)),
    );
  }

  open(user: UserRecord | null = null): void {
    this.error.set('');
    this.notice.set('');
    this.editing = user;
    this.model = { email: user?.email ?? '', display_name: user?.display_name ?? '' };
    this.selected.set(null);
    this.editor.set(true);
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    const payload: UserWrite = {
      email: this.model.email.trim() || null,
      display_name: this.model.display_name.trim() || null,
    };
    this.saving.set(true);
    this.error.set('');
    try {
      if (this.editing) await this.api.updateUser(this.editing.id, payload);
      else await this.api.createUser(payload);
      this.editor.set(false);
      await this.load();
      this.notice.set('Changes saved.');
    } catch (error) {
      this.error.set(accessManagementError(error));
    } finally {
      this.saving.set(false);
    }
  }

  async changeStatus(user: UserRecord): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      if (user.status === 'ACTIVE') await this.api.suspendUser(user.id);
      else await this.api.activateUser(user.id);
      await this.load();
    } catch (error) {
      this.error.set(accessManagementError(error));
    } finally {
      this.saving.set(false);
    }
  }

  changeFilter(): void {
    this.offset = 0;
    void this.load();
  }

  page(delta: number): void {
    this.offset = Math.max(0, this.offset + delta * this.pageSize);
    void this.load();
  }
}
