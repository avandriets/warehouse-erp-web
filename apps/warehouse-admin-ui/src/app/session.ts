import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WarehouseAuth } from '@warehouse/auth';

@Component({
  standalone: true,
  imports: [AsyncPipe, MatButtonModule, MatCardModule, MatProgressSpinnerModule, RouterLink],
  template: `<mat-card appearance="outlined" class="mx-auto mt-6 max-w-2xl sm:mt-12">
    <mat-card-header>
      <mat-card-subtitle class="tracking-[0.18em]! text-emerald-700! uppercase">Warehouse ERP</mat-card-subtitle>
      <mat-card-title class="mt-2! text-3xl! font-bold!">Admin panel</mat-card-title>
    </mat-card-header>
    <mat-card-content class="pt-4!">
      <p class="m-0 text-sm leading-6 text-stone-600">Sign in to manage users, roles, and permissions.</p>
      @if (auth.isLoading$ | async) {
        <div class="mt-6 flex items-center gap-3 text-sm text-stone-600" role="status">
          <mat-spinner diameter="24" />
          Checking your session…
        </div>
      } @else {
        @if (auth.error$ | async; as error) {
          <p class="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{{ error.message }}</p>
        }
        <div class="mt-6">
          @if (auth.isAuthenticated$ | async) {
            <a mat-flat-button routerLink="/">Open dashboard</a>
          } @else {
            <button mat-flat-button type="button" (click)="login()">Sign in with Auth0</button>
          }
        </div>
      }
    </mat-card-content>
  </mat-card>`,
})
export class LoginPage {
  readonly auth = inject(WarehouseAuth);
  private readonly route = inject(ActivatedRoute);

  login(): void {
    const target = this.route.snapshot.queryParamMap.get('returnTo') ?? '/';

    this.auth.login(target.startsWith('/') && !target.startsWith('//') ? target : '/');
  }
}

@Component({
  standalone: true,
  imports: [MatButtonModule, MatCardModule, RouterLink],
  template: `<mat-card appearance="outlined" class="mx-auto mt-6 max-w-2xl sm:mt-12">
    <mat-card-header>
      <mat-card-subtitle class="tracking-[0.18em]! text-red-700! uppercase">System access</mat-card-subtitle>
      <mat-card-title class="mt-2! text-3xl! font-bold!">Access unavailable</mat-card-title>
    </mat-card-header>
    <mat-card-content class="pt-4!">
      <p class="m-0 text-sm leading-6 text-stone-600">Your account is inactive, you do not have the required permissions, or the server is unavailable.</p>
      <div class="mt-6 flex flex-wrap gap-3">
        <a mat-flat-button routerLink="/">Check again</a>
        <button mat-stroked-button type="button" (click)="auth.logout()">Sign out</button>
      </div>
    </mat-card-content>
  </mat-card>`,
})
export class ForbiddenPage {
  readonly auth = inject(WarehouseAuth);
}
