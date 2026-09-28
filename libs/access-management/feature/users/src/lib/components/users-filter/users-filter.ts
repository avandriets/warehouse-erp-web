import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { parseUserStatus } from '@warehouse/access-management/util';
import { distinctUntilChanged, map } from 'rxjs';

@Component({
  selector: 'am-users-filter',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './users-filter.html',
})
export class UsersFilter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly control = new FormControl('', { nonNullable: true });

  constructor() {
    this.route.queryParamMap
      .pipe(
        map(params => parseUserStatus(params.get('status')) ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe(value => this.control.setValue(value, { emitEvent: false }));

    this.control.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { status: value || null, offset: null },
        queryParamsHandling: 'merge',
      });
    });
  }
}
