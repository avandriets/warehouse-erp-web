import type { OnChanges } from '@angular/core';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AccessManagementApi, accessManagementError } from '@warehouse/access-management/data-access';
import type { RoleAssignmentRecord, RoleRecord, ScopeType, UserRecord } from '@warehouse/access-management/util';

@Component({
  selector: 'am-user-access',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule],
  template: `<mat-card appearance="outlined" class="mt-6">
    <mat-card-header class="items-start justify-between">
      <mat-card-title>{{ user().display_name ?? user().email }}</mat-card-title>
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
        <div class="flex min-h-32 items-center justify-center gap-3 text-sm text-stone-600" role="status"><mat-spinner diameter="28" /> Loading access…</div>
      } @else {
        <section aria-labelledby="auth0-link-title">
          <h3 id="auth0-link-title" class="mt-0 text-lg font-semibold text-stone-900">Auth0 account linking</h3>
          @if (user().auth0_subject) {
            <p class="break-all rounded-lg bg-stone-100 px-3 py-2 font-mono text-sm text-stone-700">{{ user().auth0_subject }}</p>
          } @else {
            <form #linkForm="ngForm" class="flex flex-col gap-3 sm:flex-row sm:items-start" (ngSubmit)="link()">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full flex-1">
                <mat-label>Auth0 subject</mat-label>
                <input matInput name="subject" [(ngModel)]="subject" required placeholder="auth0|…" />
              </mat-form-field>
              <button mat-flat-button [disabled]="linkForm.invalid || busy()">Link account</button>
            </form>
          }
        </section>

        <section class="mt-8" aria-labelledby="assigned-roles-title">
          <h3 id="assigned-roles-title" class="text-lg font-semibold text-stone-900">Assigned roles</h3>
          <ul class="divide-y divide-stone-200 p-0">
            @for (assignment of assignments; track assignment.id) {
              <li class="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span class="break-all"
                  ><strong>{{ roleName(assignment.role_id) }}</strong> · {{ assignment.scope_type }} {{ assignment.scope_id ?? '' }}</span
                >
                <button mat-button type="button" (click)="revoke(assignment.id)" [disabled]="busy()">Revoke</button>
              </li>
            } @empty {
              <li class="py-4 text-sm text-stone-600">No roles assigned yet.</li>
            }
          </ul>
        </section>

        <form #assignmentForm="ngForm" class="mt-6" (ngSubmit)="assign()">
          <div class="grid gap-4 md:grid-cols-2">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
              <mat-label>Role</mat-label>
              <mat-select name="role" [(ngModel)]="roleId" required [disabled]="busy()">
                @for (role of roles; track role.id) {
                  @if (role.active) {
                    <mat-option [value]="role.id">{{ role.name }}</mat-option>
                  }
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
              <mat-label>Scope</mat-label>
              <mat-select name="scope" [(ngModel)]="scope" [disabled]="busy()">
                <mat-option value="GLOBAL">Global</mat-option>
                <mat-option value="COMPANY">Company</mat-option>
                <mat-option value="WAREHOUSE">Warehouse</mat-option>
              </mat-select>
            </mat-form-field>
            @if (scope !== 'GLOBAL') {
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full md:col-span-2">
                <mat-label>Scope UUID</mat-label>
                <input
                  matInput
                  name="scopeId"
                  [(ngModel)]="scopeId"
                  required
                  [disabled]="busy()"
                  pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                />
              </mat-form-field>
            }
          </div>
          <button mat-flat-button [disabled]="assignmentForm.invalid || busy()">Assign role</button>
        </form>
      }
    </mat-card-content>
  </mat-card>`,
})
export class UserAccess implements OnChanges {
  private readonly api = inject(AccessManagementApi);
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
      [this.roles, this.assignments] = await Promise.all([this.api.listRoles(), this.api.listRoleAssignments(this.user().id)]);
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
