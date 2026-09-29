import { Component, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap, timer } from 'rxjs';

@Component({
  selector: 'ui-query-param-search',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './query-param-search.html',
})
export class QueryParamSearch {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly label = input('Search');
  readonly placeholder = input('');
  readonly maxLength = input<number | null>(null);
  readonly resetParams = input<Record<string, null>>({});
  readonly control = new FormControl('', { nonNullable: true });

  constructor() {
    // Restart the debounce on navigation so Back/Forward cannot be overwritten by an old draft.
    this.route.queryParamMap
      .pipe(
        switchMap(params => {
          this.control.setValue(params.get('q') ?? '', { emitEvent: false });

          return this.control.valueChanges.pipe(switchMap(value => timer(300).pipe(map(() => value.trim()))));
        }),
        takeUntilDestroyed(),
      )
      .subscribe(query => {
        if (query === (this.route.snapshot.queryParamMap.get('q') ?? '')) {
          return;
        }

        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { ...this.resetParams(), q: query || null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
  }
}
