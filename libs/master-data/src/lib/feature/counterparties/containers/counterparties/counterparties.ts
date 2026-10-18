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
import { CounterpartiesApiService } from '../../../../data-access/services';
import { CounterpartiesStore } from '../../../../data-access/stores';
import type { CounterpartiesQuery, Counterparty } from '../../../../types';
import { createDirectoryStatusActions } from '../../../../util';
import { DeleteCounterpartyDialog } from '../../components';

@Component({
  selector: 'md-counterparties',
  providers: [CounterpartiesApiService, CounterpartiesStore],
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
  templateUrl: './counterparties.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Counterparties {
  private readonly store = inject(CounterpartiesStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly requestParams = computed<CounterpartiesQuery>(() => {
    const params = this.params();
    const limit = Number(params.get('limit') ?? 25);
    const offset = Number(params.get('offset') ?? 0);
    const active = params.get('active');

    return {
      q: params.get('q')?.trim() || undefined,
      active: active === 'all' ? undefined : active !== 'false',
      limit: [10, 25, 50, 100].includes(limit) ? limit : 25,
      offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0,
    };
  });

  readonly statusActions = createDirectoryStatusActions<Counterparty>({
    pending: () => !!this.store.entityState().pending || this.store.saving(),
    canEdit: () => this.canEdit(),
    archiveDialog: DeleteCounterpartyDialog,
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
  readonly displayedColumns = ['code', 'name', 'identifiers', 'roles', 'status', 'actions'];
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly offset = computed(() => this.requestParams().offset);
  readonly pageSize = computed(() => this.requestParams().limit);
  readonly pageIndex = computed(() => Math.floor(this.offset() / this.pageSize()));
  readonly total = computed(() => this.store.pagination().total ?? 0);
  readonly canCreate = computed(() => this.config.hasPermission('catalog.create'));
  readonly canEdit = computed(() => this.config.hasPermission('catalog.edit'));
  readonly status = new FormControl('true', { nonNullable: true });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const active = params.get('active');
      this.status.setValue(active === 'false' || active === 'all' ? active : 'true', { emitEvent: false });
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
          (a, b) => a.q === b.q && a.active === b.active && a.limit === b.limit && a.offset === b.offset,
        ),
        switchMap(query => {
          this.store.reset();

          return this.loadQuery(query);
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  roleLabels(record: Counterparty): string {
    return [
      record.is_supplier ? 'Supplier' : '',
      record.is_customer ? 'Customer' : '',
      record.is_other_recipient ? 'Other recipient' : '',
    ]
      .filter(Boolean)
      .join(', ');
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

  deleteRecord(record: Counterparty): void {
    this.statusActions.archive(record);
  }

  restoreRecord(record: Counterparty): void {
    this.statusActions.restore(record);
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  private loadQuery(query: CounterpartiesQuery): Observable<unknown> {
    return this.store.load(query).pipe(takeUntilDestroyed(this.destroyRef));
  }
}
