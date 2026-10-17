import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import type { PageEvent } from '@angular/material/paginator';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageLayout, QueryParamSearch, UIStateContainerComponent } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, switchMap } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import { CategoriesApiService } from '../../../../data-access/services';
import { CategoriesStore } from '../../../../data-access/stores';
import type { CategoriesQuery, Category } from '../../../../types';
import { createDirectoryStatusActions } from '../../../../util';
import { CategoryBreadcrumbs, DeleteCategoryDialog } from '../../components';

@Component({
  selector: 'md-categories',
  providers: [CategoriesApiService, CategoriesStore],
  imports: [
    CategoryBreadcrumbs,
    PageLayout,
    UIStateContainerComponent,
    QueryParamSearch,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatPaginatorModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './categories.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Categories {
  private readonly store = inject(CategoriesStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly requestParams = computed<CategoriesQuery>(() => {
    const params = this.params();
    const limit = Number(params.get('limit') ?? 25);
    const offset = Number(params.get('offset') ?? 0);
    const active = params.get('active');

    return {
      q: params.get('q')?.trim() || undefined,
      parent_id: params.get('parent_id') || undefined,
      root_only: !params.get('parent_id') && params.get('root_only') === 'true',
      active: active === 'all' ? undefined : active !== 'false',
      limit: [10, 25, 50, 100].includes(limit) ? limit : 25,
      offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0,
    };
  });

  readonly statusActions = createDirectoryStatusActions<Category>({
    pending: () => !!this.store.entityState().pending || this.store.saving(),
    canEdit: () => this.canEdit(),
    archiveDialog: DeleteCategoryDialog,
    restore: record => this.store.update({ id: record.id, payload: { active: true } }),
    accept: () => {
      if (this.requestParams().active !== undefined && this.records().length === 1 && this.offset() > 0) {
        void this.page({ pageIndex: this.pageIndex() - 1, pageSize: this.pageSize(), length: this.total() });
      } else {
        this.loadQuery(this.requestParams()).subscribe();
      }
    },
  });
  readonly actionError = this.store.actionError;
  readonly state = computed(() => ({
    ...this.store.entityState(),
    pending: this.store.entityState().pending || this.store.saving() || this.statusActions.busy(),
  }));
  readonly records = this.store.entities;
  readonly displayedColumns = ['code', 'name', 'parent', 'description', 'status', 'actions'];
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly offset = computed(() => this.requestParams().offset);
  readonly pageSize = computed(() => this.requestParams().limit);
  readonly pageIndex = computed(() => Math.floor(this.offset() / this.pageSize()));
  readonly total = computed(() => this.store.pagination().total ?? 0);
  readonly canCreate = computed(() => this.config.hasPermission('catalog.create'));
  readonly canEdit = computed(() => this.config.hasPermission('catalog.edit'));
  readonly parentId = computed(() => this.requestParams().parent_id);
  readonly ancestors = computed(() =>
    this.store.pathParentId() === (this.parentId() ?? null) ? this.store.ancestors() : [],
  );
  readonly scope = new FormControl('all', { nonNullable: true });
  readonly status = new FormControl('true', { nonNullable: true });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const active = params.get('active');
      this.scope.setValue(params.get('parent_id') ? 'children' : params.get('root_only') === 'true' ? 'roots' : 'all', {
        emitEvent: false,
      });
      this.status.setValue(active === 'false' || active === 'all' ? active : 'true', { emitEvent: false });
    });
    this.status.valueChanges.pipe(takeUntilDestroyed()).subscribe(active => {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { active: active === 'true' ? null : active, offset: null },
        queryParamsHandling: 'merge',
      });
    });
    this.scope.valueChanges.pipe(takeUntilDestroyed()).subscribe(scope => {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { parent_id: null, root_only: scope === 'roots' ? true : null, offset: null },
        queryParamsHandling: 'merge',
      });
    });
    toObservable(this.requestParams)
      .pipe(
        distinctUntilChanged(
          (a, b) =>
            a.q === b.q &&
            a.active === b.active &&
            a.limit === b.limit &&
            a.offset === b.offset &&
            a.parent_id === b.parent_id &&
            a.root_only === b.root_only,
        ),
        switchMap(query => {
          this.store.reset();

          return this.loadQuery(query);
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  load(): void {
    this.loadQuery(this.requestParams()).subscribe();
  }

  page(event: PageEvent): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        limit: event.pageSize === 25 ? null : event.pageSize,
        offset: event.pageIndex * event.pageSize || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  deleteRecord(record: Category): void {
    this.statusActions.archive(record);
  }

  restoreRecord(record: Category): void {
    this.statusActions.restore(record);
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  private loadQuery(query: CategoriesQuery): Observable<unknown> {
    return this.store.load(query).pipe(takeUntilDestroyed(this.destroyRef));
  }
}
