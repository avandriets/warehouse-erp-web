import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import type { PageEvent } from '@angular/material/paginator';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageLayout, QueryParamSearch, UIStateContainerComponent } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, finalize, switchMap } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import { PriceTypesAdapterService, PriceTypesApiService } from '../../../../data-access/services';
import { PriceTypesStore } from '../../../../data-access/stores';
import type { PriceEntryMode, PriceType, PriceTypesQuery } from '../../../../types';
import { PRICE_ENTRY_MODE_LABELS } from '../../../../types';
import { DeletePriceTypeDialog } from '../../components';

@Component({
  selector: 'md-price-types',
  providers: [PriceTypesApiService, PriceTypesAdapterService, PriceTypesStore],
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
  ],
  templateUrl: './price-types.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceTypes {
  private readonly store = inject(PriceTypesStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly dialog = inject(MatDialog);
  private readonly injector = inject(Injector);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly requestParams = computed<PriceTypesQuery>(() => {
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

  readonly state = this.store.entityState;
  readonly records = this.store.entities;
  readonly labels = PRICE_ENTRY_MODE_LABELS;
  readonly displayedColumns = ['code', 'name', 'price_entry_mode', 'status', 'actions'];
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

  entryModeLabel(mode: PriceEntryMode): string {
    return this.labels[mode];
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

  deleteRecord(record: PriceType): void {
    if (!this.canEdit() || !record.active || this.state().pending) {
      return;
    }

    this.dialog
      .open<DeletePriceTypeDialog, PriceType, boolean>(DeletePriceTypeDialog, {
        data: record,
        width: '480px',
        maxWidth: '95vw',
        injector: this.injector,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(archived => {
        if (archived) {
          if (this.requestParams().active === true && this.records().length === 1 && this.offset() > 0) {
            void this.page({ pageIndex: this.pageIndex() - 1, pageSize: this.pageSize(), length: this.total() });
          } else {
            this.load();
          }
        }
      });
  }

  private loadQuery(query: PriceTypesQuery): Observable<unknown> {
    return this.store.load(query).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        if (!this.destroyRef.destroyed && this.store.error()) {
          this.snackBar.open(this.store.error()!, 'Dismiss', { duration: 6000 });
        }
      }),
    );
  }
}
