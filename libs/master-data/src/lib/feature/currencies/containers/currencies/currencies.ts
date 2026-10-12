import { DatePipe } from '@angular/common';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageLayout, QueryParamSearch, UIStateContainerComponent } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, finalize, switchMap } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import {
  CurrenciesAdapterService,
  CurrenciesApiService,
  CurrencyRatesAdapterService,
} from '../../../../data-access/services';
import { CurrenciesStore, CurrencyRatesStore } from '../../../../data-access/stores';
import type { CurrenciesQuery, Currency, CurrencyRate, CurrencyRatesUpdate } from '../../../../types';
import { DeleteCurrencyDialog } from '../../components';

@Component({
  selector: 'md-currencies',
  providers: [
    CurrenciesApiService,
    CurrenciesAdapterService,
    CurrenciesStore,
    CurrencyRatesAdapterService,
    CurrencyRatesStore,
  ],
  imports: [
    DatePipe,
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
  templateUrl: './currencies.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Currencies {
  private readonly store = inject(CurrenciesStore);
  private readonly ratesStore = inject(CurrencyRatesStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly dialog = inject(MatDialog);
  private readonly injector = inject(Injector);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly requestParams = computed<CurrenciesQuery>(() => {
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
  readonly ratesState = this.ratesStore.state;
  readonly ratesError = this.ratesStore.actionError;
  readonly rates = this.ratesStore.data;
  readonly displayedColumns = ['code', 'name', 'symbol', 'rate', 'status', 'actions'];
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly offset = computed(() => this.requestParams().offset);
  readonly pageSize = computed(() => this.requestParams().limit);
  readonly pageIndex = computed(() => Math.floor(this.offset() / this.pageSize()));
  readonly total = computed(() => this.store.pagination().total ?? 0);
  readonly canCreate = computed(() => this.config.hasPermission('settings.manage'));
  readonly canEdit = computed(() => this.config.hasPermission('settings.manage'));
  readonly status = new FormControl('true', { nonNullable: true });

  constructor() {
    this.loadRatesOverview();
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

  loadRatesOverview(): void {
    if (this.ratesState().pending) {
      return;
    }

    this.ratesStore.dismissActionError();
    this.ratesStore
      .load()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (!this.destroyRef.destroyed && this.ratesStore.error()) {
            this.snackBar.open(this.ratesStore.error()!, 'Dismiss', { duration: 6000 });
          }
        }),
      )
      .subscribe();
  }

  dismissRatesError(): void {
    this.ratesStore.dismissActionError();
  }

  downloadRates(): void {
    const overview = this.rates();
    if (!overview?.base_currency || !this.canEdit() || this.state().pending || this.ratesState().pending) {
      return;
    }

    this.saveRates(
      { type: 'rates', base_currency_id: overview.base_currency.id, expected_version: overview.settings_version },
      'Exchange rates loaded.',
    );
  }

  rateFor(record: Currency): CurrencyRate | undefined {
    return this.rates()?.batch?.rates.find(rate => rate.quote_code === record.code);
  }

  load(): void {
    if (this.state().pending || this.ratesState().pending) {
      return;
    }

    this.loadRatesOverview();
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

  deleteRecord(record: Currency): void {
    if (!this.canEdit() || !record.active || this.state().pending || this.rates()?.base_currency?.id === record.id) {
      return;
    }

    this.dialog
      .open<DeleteCurrencyDialog, Currency, boolean>(DeleteCurrencyDialog, {
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

  private saveRates(update: CurrencyRatesUpdate, message: string): void {
    this.ratesStore
      .save(update)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (!this.destroyRef.destroyed && this.ratesError()) {
            this.snackBar.open(this.ratesError()!, 'Dismiss', { duration: 6000 });
          }
        }),
      )
      .subscribe(() => {
        this.snackBar.open(message, 'Dismiss', { duration: 4000 });
      });
  }

  private loadQuery(query: CurrenciesQuery): Observable<unknown> {
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
