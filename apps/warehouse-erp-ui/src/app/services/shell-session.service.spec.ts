import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CurrentUser } from '@warehouse/auth';
import { WarehouseAuthService } from '@warehouse/auth';

import { ShellSessionService } from './shell-session.service';

const profile: CurrentUser = {
  user_id: 'employee',
  subject: 'auth0|employee',
  status: 'ACTIVE',
  permissions: [],
  first_name: 'Ada',
  last_name: 'Lovelace',
  display_name: 'Old label',
  email: 'ada@erp.test',
};

describe('account menu profile', () => {
  it('uses ERP names and email and reacts to a refreshed profile', () => {
    const current = signal<CurrentUser | null>(profile);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        ShellSessionService,
        {
          provide: WarehouseAuthService,
          useValue: {
            get currentUser(): CurrentUser | null {
              return current();
            },
            user: signal({ name: 'Auth0 nickname', email: 'external@auth.test' }),
          },
        },
      ],
    });
    const session = TestBed.inject(ShellSessionService);
    expect(session.userName()).toBe('Ada Lovelace');
    expect(session.email()).toBe('ada@erp.test');
    current.set({ ...profile, first_name: 'Grace', last_name: 'Hopper' });
    expect(session.userName()).toBe('Grace Hopper');
    current.set({ ...profile, first_name: null, last_name: 'Lovelace' });
    expect(session.userName()).toBe('Lovelace');
    current.set({ ...profile, first_name: null, last_name: null, display_name: 'ERP name' });
    expect(session.userName()).toBe('ERP name');
    current.set({ ...profile, first_name: null, last_name: null, display_name: null });
    expect(session.userName()).toBe('ada@erp.test');
    current.set(null);
    expect(session.userName()).toBe('Auth0 nickname');
    expect(session.email()).toBe('external@auth.test');
  });
});
