import type { OnChanges } from '@angular/core';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AccessManagementApiService, accessManagementError } from '@warehouse/access-management/data-access';
import type { RoleAssignmentRecord, RoleRecord, ScopeType, UserRecord } from '@warehouse/access-management/util';

@Component({
  selector: 'am-user-access',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './user-access.html',
})
export class UserAccess implements OnChanges {
  private readonly api = inject(AccessManagementApiService);
  readonly user = input.required<UserRecord>();
  readonly closed = output<void>();
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  roles: RoleRecord[] = [];
  assignments: RoleAssignmentRecord[] = [];
  subject = '';
  roleId = '';
  scope: ScopeType = 'GLOBAL';
  scopeId = '';

  ngOnChanges(): void {
    this.subject = '';
    this.roleId = '';
    this.scope = 'GLOBAL';
    this.scopeId = '';
    this.notice.set('');
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      [this.roles, this.assignments] = await Promise.all([
        this.api.listRoles(),
        this.api.listRoleAssignments(this.user().id),
      ]);
    } catch (error) {
      this.error.set(accessManagementError(error));
    } finally {
      this.loading.set(false);
    }
  }

  roleName(id: string): string {
    return this.roles.find(role => role.id === id)?.name ?? id;
  }

  link(): Promise<void> {
    return this.mutate(async () => {
      const updated = await this.api.linkAuth0(this.user().id, this.subject.trim());
      this.user().auth0_subject = updated.auth0_subject;
    });
  }

  assign(): Promise<void> {
    return this.mutate(() =>
      this.api.assignRole(this.user().id, {
        role_id: this.roleId,
        scope_type: this.scope,
        scope_id: this.scope === 'GLOBAL' ? null : this.scopeId.trim(),
      }),
    );
  }

  revoke(assignmentId: string): Promise<void> {
    return this.mutate(() => this.api.revokeRoleAssignment(this.user().id, assignmentId));
  }

  private async mutate(action: () => Promise<unknown>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await action();
      await this.load();
      this.notice.set('Changes saved.');
    } catch (error) {
      this.error.set(accessManagementError(error));
    } finally {
      this.busy.set(false);
    }
  }
}
