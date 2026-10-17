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
import { UnitsApiService } from '../../../../data-access/services';
import { UnitsStore } from '../../../../data-access/stores';
import type { Unit, UnitDimension, UnitsQuery } from '../../../../types';
import { UNIT_DIMENSION_LABELS, UNIT_DIMENSIONS, unitFactor } from '../../../../types';
import { createDirectoryStatusActions } from '../../../../util';
import { DeleteUnitDialog } from '../../components';

@Component({
  selector: 'md-units',
  providers: [UnitsApiService, UnitsStore],
  imports: [
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
  templateUrl: './units.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Units {
  private readonly store = inject(UnitsStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly requestParams = computed<UnitsQuery>(() => {
    const params = this.params();
    const limit = Number(params.get('limit') ?? 25);
    const offset = Number(params.get('offset') ?? 0);
    const active = params.get('active');
    const dimension = params.get('dimension') as UnitDimension;

    return {
      q: params.get('q')?.trim() || undefined,
      dimension: UNIT_DIMENSIONS.includes(dimension) ? dimension : undefined,
      active: active === 'all' ? undefined : active !== 'false',
      limit: [10, 25, 50, 100].includes(limit) ? limit : 25,
      offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0,
    };
  });

  readonly statusActions = createDirectoryStatusActions<Unit>({
    pending: () => !!this.store.entityState().pending || this.store.saving(),
    canEdit: () => this.canEdit(),
    archiveDialog: DeleteUnitDialog,
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
  readonly labels = UNIT_DIMENSION_LABELS;
  readonly dimensions = UNIT_DIMENSIONS;
  readonly factorLabel = unitFactor;
  readonly displayedColumns = ['code', 'name', 'symbol', 'dimension', 'conversion', 'precision', 'status', 'actions'];
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly offset = computed(() => this.requestParams().offset);
  readonly pageSize = computed(() => this.requestParams().limit);
  readonly pageIndex = computed(() => Math.floor(this.offset() / this.pageSize()));
  readonly total = computed(() => this.store.pagination().total ?? 0);
  readonly canCreate = computed(() => this.config.hasPermission('catalog.create'));
  readonly canEdit = computed(() => this.config.hasPermission('catalog.edit'));
  readonly dimension = new FormControl('all', { nonNullable: true });
  readonly status = new FormControl('true', { nonNullable: true });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const active = params.get('active');
      const dimension = params.get('dimension') as UnitDimension;
      this.dimension.setValue(UNIT_DIMENSIONS.includes(dimension) ? dimension : 'all', { emitEvent: false });
      this.status.setValue(active === 'false' || active === 'all' ? active : 'true', { emitEvent: false });
    });
    this.status.valueChanges.pipe(takeUntilDestroyed()).subscribe(active => {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { active: active === 'true' ? null : active, offset: null },
        queryParamsHandling: 'merge',
      });
    });
    this.dimension.valueChanges.pipe(takeUntilDestroyed()).subscribe(dimension => {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { dimension: dimension === 'all' ? null : dimension, offset: null },
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
            a.dimension === b.dimension,
        ),
        switchMap(query => {
          this.store.reset();

          return this.loadQuery(query);
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  dimensionLabel(dimension: UnitDimension): string {
    return this.labels[dimension];
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

  deleteRecord(record: Unit): void {
    this.statusActions.archive(record);
  }

  restoreRecord(record: Unit): void {
    this.statusActions.restore(record);
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  private loadQuery(query: UnitsQuery): Observable<unknown> {
    return this.store.load(query).pipe(takeUntilDestroyed(this.destroyRef));
  }
}
