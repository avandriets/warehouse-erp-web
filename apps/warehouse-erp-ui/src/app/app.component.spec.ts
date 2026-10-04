import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { routes } from './app.routes';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should keep the root component limited to routing', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('mat-toolbar')).toBeNull();
  });
});

describe('initial session check', () => {
  it('shows a pending screen until the auth guard can render the sign-in invitation', async () => {
    const loading = signal(true);
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(routes),
        {
          provide: WarehouseAuthService,
          useValue: {
            loading,
            authenticated: signal(false),
            error: signal(null),
            user: signal(null),
            ensureCurrentUser: () => of(null),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const navigation = TestBed.inject(Router).navigateByUrl('/');
    TestBed.tick();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Checking your session');
    expect(root.querySelector('erp-layout')).toBeNull();

    loading.set(false);
    TestBed.tick();
    await navigation;
    await fixture.whenStable();
    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(root.textContent).toContain('Sign in to continue');
  });
});
