import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { WarehouseAuthService } from '@warehouse/auth';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: WarehouseAuthService,
          useValue: {
            loading: signal(false),
            authenticated: signal(false),
            user: signal(null),
            error: signal(null),
            login: vi.fn(),
            signup: vi.fn(),
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
