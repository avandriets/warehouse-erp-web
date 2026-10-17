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
import type { UIStateStatus } from '@warehouse/shared';
import { combineUIStates, PageLayout, QueryParamSearch, UIStateContainerComponent } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, switchMap } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import { CategoriesApiService, ProductsApiService } from '../../../../data-access/services';
import { CategoriesStore, ProductsStore } from '../../../../data-access/stores';
import type { Product, ProductsQuery } from '../../../../types';
import { createDirectoryStatusActions } from '../../../../util';
import { CategorySelect } from '../../../categories/components';
import { DeleteProductDialog } from '../../components';

@Component({
  selector: 'md-products',
  providers: [ProductsApiService, ProductsStore, CategoriesApiService, CategoriesStore],
  imports: [
    PageLayout,
    UIStateContainerComponent,
    QueryParamSearch,
    CategorySelect,
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
  templateUrl: './products.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Products {
  readonly categories = inject(CategoriesStore);
  private readonly store = inject(ProductsStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly requestParams = computed<ProductsQuery>(() => {
    const params = this.params();
    const limit = Number(params.get('limit') ?? 25);
    const offset = Number(params.get('offset') ?? 0);
    const active = params.get('active');

    return {
      q: params.get('q')?.trim() || undefined,
      category_id: params.get('category_id') || undefined,
      active: active === 'all' ? undefined : active !== 'false',
      limit: [10, 25, 50, 100].includes(limit) ? limit : 25,
      offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0,
    };
  });

  readonly statusActions = createDirectoryStatusActions<Product>({
    pending: (): boolean => !!this.state().pending,
    canEdit: () => this.canEdit(),
    archiveDialog: DeleteProductDialog,
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
  readonly state = computed<UIStateStatus<string>>(() => {
    const products = this.store.entityState();

    return {
      ...combineUIStates(products, this.categories.entityState()),
      pending:
        products.pending || this.categories.entityState().pending || this.store.saving() || this.statusActions.busy(),
      empty: products.empty,
    };
  });
  readonly records = this.store.entities;
  readonly displayedColumns = ['code', 'name', 'category', 'unit', 'status', 'actions'];
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly offset = computed(() => this.requestParams().offset);
  readonly pageSize = computed(() => this.requestParams().limit);
  readonly pageIndex = computed(() => Math.floor(this.offset() / this.pageSize()));
  readonly total = computed(() => this.store.pagination().total ?? 0);
  readonly canCreate = computed(() => this.config.hasPermission('catalog.create'));
  readonly status = new FormControl('true', { nonNullable: true });
  readonly category = new FormControl<string | null>(null);

  constructor() {
    this.categories.loadAll({ limit: 100, offset: 0 }).subscribe();
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const active = params.get('active');
      if (this.category.value !== params.get('category_id')) {
        this.category.setValue(params.get('category_id'), { emitEvent: false });
      }
      this.status.setValue(active === 'false' || active === 'all' ? active : 'true', { emitEvent: false });
    });
    this.category.valueChanges.pipe(takeUntilDestroyed()).subscribe(categoryId => {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { category_id: categoryId, offset: null },
        queryParamsHandling: 'merge',
      });
    });
    this.status.valueChanges.pipe(takeUntilDestroyed()).subscribe(active => {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { active: active === 'true' ? null : active, offset: null },
        queryParamsHandling: 'merge',
      });
    });
    toObservable(this.requestParams)
      .pipe(
        distinctUntilChanged(
          (a, b) =>
            a.q === b.q &&
            a.category_id === b.category_id &&
            a.active === b.active &&
            a.limit === b.limit &&
            a.offset === b.offset,
        ),
        switchMap(query => {
          this.store.reset();

          return this.loadQuery(query);
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  canEdit(): boolean {
    return this.config.hasPermission('catalog.edit');
  }

  load(): void {
    if (!this.categories.entityState().resolved) {
      this.categories.loadAll({ limit: 100, offset: 0 }).subscribe();
    }
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

  deleteRecord(record: Product): void {
    this.statusActions.archive(record);
  }

  restoreRecord(record: Product): void {
    this.statusActions.restore(record);
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  private loadQuery(query: ProductsQuery): Observable<unknown> {
    return this.store.load(query).pipe(takeUntilDestroyed(this.destroyRef));
  }
}
