import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideAccessManagement } from '@warehouse/access-management';

import { ROLES_SUCCESS_MESSAGE, RolesStore } from './roles.store';
import { USERS_SUCCESS_MESSAGE, UsersStore } from './users.store';

describe('user and role store notifications', () => {
  const snackBar = { open: vi.fn() };
  let http: HttpTestingController;
  beforeEach(() => {
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAccessManagement({ apiUrl: '/api' }),
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('keeps save and account-link messages distinct and isolates simultaneous user stores', () => {
    const parent = TestBed.inject(Injector);
    const editorScope = Injector.create({
      parent,
      providers: [UsersStore, { provide: USERS_SUCCESS_MESSAGE, useValue: 'Changes saved.' }],
    });
    const linkScope = Injector.create({
      parent,
      providers: [UsersStore, { provide: USERS_SUCCESS_MESSAGE, useValue: 'Account linked.' }],
    });
    const listScope = Injector.create({ parent, providers: [UsersStore] });
    try {
      const editor = editorScope.get(UsersStore);
      const link = linkScope.get(UsersStore);
      listScope.get(UsersStore);
      editor.create({ email: 'user@example.test', first_name: null, last_name: null }).subscribe();
      http.expectOne('/api/identity/users').flush({ id: 'u1' });
      expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('Changes saved.', 'Dismiss', { duration: 4000 });
      snackBar.open.mockClear();
      link.update({ id: 'u1', payload: { auth0_subject: 'auth0|one' } }).subscribe();
      http.expectOne('/api/identity/users/u1/auth0').flush({ id: 'u1', auth0_subject: 'auth0|one' });
      expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('Account linked.', 'Dismiss', { duration: 4000 });
      snackBar.open.mockClear();
      editor
        .update({ id: 'u1', payload: { first_name: 'Updated', last_name: null, email: 'user@example.test' } })
        .subscribe();
      http.expectOne('/api/identity/users/u1').flush({}, { status: 409, statusText: 'Conflict' });
      expect(snackBar.open).not.toHaveBeenCalled();
      const cancelled = editor
        .update({ id: 'u1', payload: { first_name: 'Updated', last_name: null, email: 'user@example.test' } })
        .subscribe();
      const request = http.expectOne('/api/identity/users/u1');
      cancelled.unsubscribe();
      expect(request.cancelled).toBe(true);
      expect(snackBar.open).not.toHaveBeenCalled();
    } finally {
      editorScope.destroy();
      linkScope.destroy();
      listScope.destroy();
    }
  });

  it('notifies once for a role dialog while another role store listens', () => {
    const parent = TestBed.inject(Injector);
    const one = Injector.create({
      parent,
      providers: [RolesStore, { provide: ROLES_SUCCESS_MESSAGE, useValue: 'Changes saved.' }],
    });
    const two = Injector.create({
      parent,
      providers: [RolesStore, { provide: ROLES_SUCCESS_MESSAGE, useValue: 'Changes saved.' }],
    });
    try {
      two.get(RolesStore);
      one.get(RolesStore).create({ code: 'EDITOR', name: 'Editor', description: null }).subscribe();
      http.expectOne('/api/identity/roles').flush({ id: 'r1' });
      expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('Changes saved.', 'Dismiss', { duration: 4000 });
      snackBar.open.mockClear();
      one
        .get(RolesStore)
        .update({ id: 'r1', payload: { name: 'Updated', description: null, active: true } })
        .subscribe();
      http.expectOne('/api/identity/roles/r1').flush({ id: 'r1', name: 'Updated' });
      expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('Changes saved.', 'Dismiss', { duration: 4000 });
    } finally {
      one.destroy();
      two.destroy();
    }
  });
});
