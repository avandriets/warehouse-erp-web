import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { CurrentUser } from '@warehouse/auth';
import { PageLayout, UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { ProfileStore } from '../../data-access/stores';

@Component({
  selector: 'erp-profile',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    PageLayout,
    UIStateContainerComponent,
  ],
  providers: [ProfileStore],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly store = inject(ProfileStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = this.store.state;
  readonly actionError = this.store.actionError;
  readonly fields = [
    { key: 'first_name', label: 'First name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'display_name', label: 'Display name' },
    { key: 'email', label: 'Email' },
  ] as const;
  readonly form = new FormGroup({
    first_name: new FormControl('', { nonNullable: true }),
    last_name: new FormControl('', { nonNullable: true }),
    display_name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: Validators.email }),
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.store
      .reload()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => this.reset(user));
  }

  save(): void {
    const { pending, resolved } = this.state();
    if (pending || !resolved) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const values = this.form.getRawValue();
    this.form.disable();
    this.store
      .update({
        first_name: values.first_name.trim() || null,
        last_name: values.last_name.trim() || null,
        display_name: values.display_name.trim() || null,
        email: values.email.trim() || null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.form.enable()),
      )
      .subscribe(user => {
        this.reset(user);
        this.snackBar.open('Profile saved.', 'Dismiss', { duration: 4000 });
      });
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  private reset(user: CurrentUser): void {
    this.form.reset({
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      display_name: user.display_name ?? '',
      email: user.email ?? '',
    });
  }
}
