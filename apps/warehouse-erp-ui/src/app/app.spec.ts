import { TestBed } from '@angular/core/testing';
import { WarehouseAuth } from '@warehouse/auth';
import { of } from 'rxjs';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: WarehouseAuth,
          useValue: {
            isLoading$: of(false),
            isAuthenticated$: of(false),
            user$: of(null),
            error$: of(null),
            loginWithRedirect: vi.fn(),
            logout: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the login screen', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Warehouse management');
    expect(compiled.querySelector('.primary')?.textContent).toContain('Sign in');
  });
});
