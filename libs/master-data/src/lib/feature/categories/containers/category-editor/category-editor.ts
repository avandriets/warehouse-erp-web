import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { UIStateStatus } from '@warehouse/shared';
import { combineUIStates, entityEditorState, PageLayout, UIStateContainerComponent } from '@warehouse/shared';
import { distinctUntilChanged, finalize, map } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import { CategoriesApiService } from '../../../../data-access/services';
import { CategoriesStore } from '../../../../data-access/stores';
import type { Category } from '../../../../types';
import { createDirectoryStatusActions } from '../../../../util';
import { CategorySelect, DeleteCategoryDialog } from '../../components';

@Component({
  selector: 'md-category-editor',
  providers: [CategoriesApiService, CategoriesStore],
  imports: [
    PageLayout,
    RouterLink,
    UIStateContainerComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    CategorySelect,
  ],
  templateUrl: './category-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryEditor {
  private readonly store = inject(CategoriesStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly editing = this.route.snapshot.data['mode'] === 'edit';
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly record = computed(() => this.store.entityById(this.id()));
  readonly canManage = computed(() => this.config.hasPermission('catalog.edit'));
  readonly statusActions = createDirectoryStatusActions<Category>({
    pending: (): boolean => !!this.state().pending,
    canEdit: () => this.config.hasPermission('catalog.edit'),
    archiveDialog: DeleteCategoryDialog,
    restore: record => this.store.update({ id: record.id, payload: { active: true } }),
    accept: record => this.store.upsert(record),
  });
  readonly state = computed<UIStateStatus<string>>(() =>
    combineUIStates(
      this.store.entityState(),
      entityEditorState({
        editing: this.editing,
        exists: !!this.store.entityById(this.id()),
        operation: this.store.operationById(this.id()),
        saving: this.store.saving() || this.statusActions.busy(),
      }),
    ),
  );
  readonly parentOptions = computed(() => {
    const categories = this.store.entities();
    if (!this.editing) {
      return categories;
    }

    const excluded = new Set([this.id()]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const category of categories) {
        if (category.parent_id && excluded.has(category.parent_id) && !excluded.has(category.id)) {
          excluded.add(category.id);
          changed = true;
        }
      }
    }

    return categories.filter(category => !excluded.has(category.id));
  });
  readonly actionError = computed(() => (this.state().rejected ? null : this.store.actionError()));
  readonly form = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(64)],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)],
    }),
    parent_id: new FormControl<string | null>(null),
    description: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map(params => params.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.load());
  }

  load(): void {
    this.store.reset();
    this.resetForm();
    this.store.loadAll({ limit: 100, offset: 0 }).subscribe();
    if (this.editing) {
      this.store.getById(this.id()).subscribe(record => this.fillForm(record));
    }
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  save(): void {
    if (this.state().pending || !this.state().resolved || this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const values = this.form.getRawValue();
    const record = this.store.entityById(this.id());
    if (this.editing && !record) {
      return;
    }

    this.form.disable({ emitEvent: false });
    const request = record
      ? this.store.update({
          id: record.id,
          payload: {
            name: values.name,
            parent_id: values.parent_id,
            description: values.description,
          },
        })
      : this.store.create({
          code: values.code,
          name: values.name,
          parent_id: values.parent_id,
          description: values.description,
        });
    request.pipe(finalize(() => this.applyFormLocks())).subscribe(() => {
      this.back();
    });
  }

  back(): void {
    void this.router.navigate(['.'], { relativeTo: this.route.parent, queryParamsHandling: 'preserve' });
  }

  private resetForm(): void {
    this.form.reset({
      code: '',
      name: '',
      parent_id: this.editing ? null : this.route.snapshot.queryParamMap.get('parent_id'),
      description: '',
    });
    this.applyFormLocks();
  }

  private fillForm(record: Category): void {
    this.form.reset({ ...record, description: record.description ?? '' });
    this.applyFormLocks();
  }

  private applyFormLocks(): void {
    this.form.enable({ emitEvent: false });
    if (this.editing) {
      this.form.controls.code.disable({ emitEvent: false });
    }
  }
}
