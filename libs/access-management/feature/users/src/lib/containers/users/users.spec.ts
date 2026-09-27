import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideAccessManagement } from '@warehouse/access-management';
import type { UserRecord } from '@warehouse/access-management/util';
import { UrlSearch } from '@warehouse/shared';

import type { UserFormDialog } from '../../components';
import { UsersFilter } from '../../components';
import { UsersPage } from './users';

describe('users page', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  function editor(): UserFormDialog {
    return TestBed.inject(MatDialog).openDialogs[0].componentInstance as UserFormDialog;
  }

  function filterControl(): UsersFilter {
    return harness.routeDebugElement!.query(By.directive(UsersFilter)).componentInstance;
  }

  function search(): UrlSearch {
    return harness.routeDebugElement!.query(By.directive(UrlSearch)).componentInstance;
  }

  async function changeFilter(value: string): Promise<void> {
    filterControl().control.setValue(value);
    await harness.fixture.whenStable();
  }

  async function changeQuery(value: string): Promise<void> {
    search().control.setValue(value);
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain(`q=${value}`));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAccessManagement({ apiUrl: '/api' }),
        provideRouter([{ path: 'users', component: UsersPage }]),
        provideLocationMocks(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(Router).setUpLocationChangeListener();
  });

  afterEach(() => http.verify());

  async function create(url = '/users', request = '/api/identity/users?limit=25&offset=0'): Promise<UsersPage> {
    harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(url, UsersPage);
    http.expectOne(request).flush([]);
    await harness.fixture.whenStable();
    return component;
  }

  it('creates users with the backend contract and refreshes the list', async () => {
    const component = await create();
    component.open();
    editor().form.setValue({ email: 'new@example.com', display_name: ' New User ' });
    editor().save();
    const loader = TestbedHarnessEnvironment.documentRootLoader(harness.fixture);
    const save = await loader.getHarness(MatButtonHarness.with({ text: 'Saving…' }));
    expect(await save.isDisabled()).toBe(true);
    await save.click();
    const request = http.expectOne('/api/identity/users');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'new@example.com', display_name: 'New User' });
    request.flush({ id: 'u1' });
    await vi.waitFor(() => {
      const refresh = http.expectOne('/api/identity/users?limit=25&offset=0');
      expect(component.loading()).toBe(true);
      refresh.flush([]);
    });
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0);
  });

  it('preserves form values after a rejected write', async () => {
    const component = await create();
    component.open();
    editor().form.setValue({ email: 'duplicate@example.com', display_name: '' });
    editor().save();
    http
      .expectOne('/api/identity/users')
      .flush({ detail: 'Email already exists' }, { status: 409, statusText: 'Conflict' });
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(1);
    expect(editor().form.controls.email.value).toBe('duplicate@example.com');
    expect(editor().store.actionError()).toBe('Email already exists');
  });

  it('resets pagination when filtering by status', async () => {
    const component = await create();
    await changeFilter('SUSPENDED');
    http.expectOne('/api/identity/users?limit=25&offset=0&status=SUSPENDED').flush([]);
    expect(component.offset()).toBe(0);
  });
  it('restores URL filters, pagination and local search without storing them in the store', async () => {
    const component = await create(
      '/users?status=ACTIVE&offset=25&q=alex',
      '/api/identity/users?limit=25&offset=25&status=ACTIVE',
    );
    expect(filterControl().control.value).toBe('ACTIVE');
    expect(component.offset()).toBe(25);
    expect(component.query()).toBe('alex');
    await changeQuery('sam');
    expect(TestBed.inject(Router).url).toContain('q=sam');
    http.expectNone(request => request.url === '/api/identity/users');
    await component.page(1);
    await harness.fixture.whenStable();
    http.expectOne('/api/identity/users?limit=25&offset=50&status=ACTIVE').flush([]);
    TestBed.inject(Location).back();
    await vi.waitFor(() => http.expectOne('/api/identity/users?limit=25&offset=25&status=ACTIVE').flush([]));
    expect(component.offset()).toBe(25);
    expect(component.query()).toBe('sam');
  });

  it('ignores invalid URL values and reloads the current URL after saving', async () => {
    const component = await create('/users?status=bad&offset=-10');
    expect(filterControl().control.value).toBe('');
    expect(component.offset()).toBe(0);
    await TestBed.inject(Router).navigateByUrl('/users?status=ACTIVE&offset=25');
    await harness.fixture.whenStable();
    http.expectOne('/api/identity/users?limit=25&offset=25&status=ACTIVE').flush([]);
    component.open();
    editor().form.setValue({ email: 'new@example.com', display_name: 'New' });
    editor().save();
    http.expectOne('/api/identity/users').flush({ id: 'new-user' });
    await vi.waitFor(() => http.expectOne('/api/identity/users?limit=25&offset=25&status=ACTIVE').flush([]));
    expect(component.offset()).toBe(25);
  });

  it('does not let a late response replace a new URL selection', async () => {
    const component = await create();
    await changeFilter('ACTIVE');
    const old = http.expectOne('/api/identity/users?limit=25&offset=0&status=ACTIVE');
    await changeFilter('SUSPENDED');
    http.expectOne('/api/identity/users?limit=25&offset=0&status=SUSPENDED').flush([{ id: 'new' }]);
    expect(old.cancelled).toBe(true);
    await vi.waitFor(() => expect(component.users().map(user => user.id)).toEqual(['new']));
  });
  it.each([
    ['ACTIVE', 'SUSPENDED', 'suspend'],
    ['SUSPENDED', 'ACTIVE', 'activate'],
  ] as const)('changes %s to %s and refreshes the current page', async (status, nextStatus, endpoint) => {
    const component = await create('/users?offset=25', '/api/identity/users?limit=25&offset=25');
    const user: UserRecord = {
      id: 'u1',
      status,
      email: null,
      display_name: null,
      auth0_subject: null,
      created_at: '',
      updated_at: '',
    };
    component.store.replaceAll([user]);
    component.changeStatus(user);
    if (status === 'ACTIVE') {
      http.expectNone('/api/identity/users/u1/suspend');
      TestBed.inject(MatDialog).openDialogs[0].close(true);
      await vi.waitFor(() => expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0));
    }
    const request = http.expectOne(`/api/identity/users/u1/${endpoint}`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ ...user, status: nextStatus });
    await vi.waitFor(() => {
      const refresh = http.expectOne('/api/identity/users?limit=25&offset=25');
      expect(component.loading()).toBe(true);
      refresh.flush([{ ...user, status: nextStatus }]);
    });
    expect(component.users()[0].status).toBe(nextStatus);
    expect(component.saving()).toBe(false);
  });

  it('preserves the current status and exposes an error when a status change fails', async () => {
    const component = await create();
    const user: UserRecord = {
      id: 'u1',
      status: 'ACTIVE',
      email: null,
      display_name: null,
      auth0_subject: null,
      created_at: '',
      updated_at: '',
    };
    component.store.replaceAll([user]);
    component.changeStatus(user);
    TestBed.inject(MatDialog).openDialogs[0].close(true);
    await vi.waitFor(() => expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0));
    http
      .expectOne('/api/identity/users/u1/suspend')
      .flush({ detail: 'Cannot suspend this user' }, { status: 409, statusText: 'Conflict' });
    expect(component.users()[0].status).toBe('ACTIVE');
    expect(component.error()).toBe('Cannot suspend this user');
    expect(component.saving()).toBe(false);
    http.expectNone(request => request.method === 'GET');
  });
  it('does not suspend a user when confirmation is cancelled', async () => {
    const component = await create();
    component.changeStatus({ id: 'u1', status: 'ACTIVE', display_name: 'Alex' } as UserRecord);
    http.expectNone(request => request.method === 'POST');
    TestBed.inject(MatDialog).openDialogs[0].close(false);
    await vi.waitFor(() => expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0));
    http.expectNone(request => request.method === 'POST');
    expect(component.saving()).toBe(false);
  });
  it('edits a user through the dialog form and closes only after success', async () => {
    const component = await create();
    const user: UserRecord = {
      id: 'u1',
      email: 'old@example.com',
      display_name: 'Old',
      status: 'ACTIVE',
      auth0_subject: null,
      created_at: '',
      updated_at: '',
    };
    component.open(user);
    const loader = TestbedHarnessEnvironment.documentRootLoader(harness.fixture);
    const email = await loader.getHarness(MatInputHarness.with({ selector: '[formControlName="email"]' }));
    await email.setValue('updated@example.com');
    const save = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
    await save.click();
    const request = http.expectOne('/api/identity/users/u1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ email: 'updated@example.com', display_name: 'Old' });
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(1);
    request.flush({ ...user, email: 'updated@example.com' });
    await vi.waitFor(() => http.expectOne('/api/identity/users?limit=25&offset=0').flush([]));
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0);
  });

  it('validates new users and cancels the dialog without writing', async () => {
    const component = await create();
    component.open();
    editor().save();
    http.expectNone(request => request.method === 'POST');
    const loader = TestbedHarnessEnvironment.documentRootLoader(harness.fixture);
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Cancel' }))).click();
    await vi.waitFor(() => expect(component.saving()).toBe(false));
    http.expectNone(request => request.method === 'POST');
  });

  it('reapplies a filter after external URL navigation and cancels stale search drafts', async () => {
    const component = await create();
    await changeFilter('ACTIVE');
    http.expectOne('/api/identity/users?limit=25&offset=0&status=ACTIVE').flush([]);
    await TestBed.inject(Router).navigateByUrl('/users?status=SUSPENDED&q=restored');
    await harness.fixture.whenStable();
    http.expectOne('/api/identity/users?limit=25&offset=0&status=SUSPENDED').flush([]);
    expect(filterControl().control.value).toBe('SUSPENDED');
    expect(search().control.value).toBe('restored');
    await changeFilter('ACTIVE');
    http.expectOne('/api/identity/users?limit=25&offset=0&status=ACTIVE').flush([]);
    search().control.setValue('stale draft');
    await TestBed.inject(Router).navigateByUrl('/users?status=ACTIVE&q=from-url');
    await harness.fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 350));
    expect(search().control.value).toBe('from-url');
    expect(component.query()).toBe('from-url');
    expect(TestBed.inject(Router).url).toContain('q=from-url');
    http.expectNone(request => request.method === 'GET');
  });

  it('opens user access in a dialog', async () => {
    const component = await create();
    component.store.replaceAll([
      {
        id: 'u1',
        email: 'alex@example.com',
        display_name: 'Alex',
        status: 'ACTIVE',
        auth0_subject: null,
        created_at: '',
        updated_at: '',
      },
    ]);
    const loader = TestbedHarnessEnvironment.loader(harness.fixture);
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Access' }))).click();
    http.expectOne('/api/identity/roles').flush([]);
    http.expectOne('/api/identity/users/u1/role-assignments').flush([]);
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(1);
  });
  it('closes an open editor when the page is destroyed without submitting it', async () => {
    const component = await create();
    component.open();
    const dialogs = TestBed.inject(MatDialog);
    expect(dialogs.openDialogs).toHaveLength(1);
    harness.fixture.destroy();
    await vi.waitFor(() => expect(dialogs.openDialogs).toHaveLength(0));
    http.expectNone(request => request.method === 'POST');
  });

  it('closes confirmation on page destruction without changing the user', async () => {
    const component = await create();
    component.changeStatus({ id: 'u1', status: 'ACTIVE', display_name: 'Alex' } as UserRecord);
    const dialogs = TestBed.inject(MatDialog);
    harness.fixture.destroy();
    await vi.waitFor(() => expect(dialogs.openDialogs).toHaveLength(0));
    http.expectNone(request => request.method === 'POST');
  });
  it('blocks Escape while access is saving and restores it after an error', async () => {
    const component = await create();
    component.store.replaceAll([
      {
        id: 'u1',
        email: 'alex@example.com',
        display_name: 'Alex',
        status: 'ACTIVE',
        auth0_subject: null,
        created_at: '',
        updated_at: '',
      },
    ]);
    const loader = TestbedHarnessEnvironment.documentRootLoader(harness.fixture);
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Access' }))).click();
    http.expectOne('/api/identity/roles').flush([]);
    http.expectOne('/api/identity/users/u1/role-assignments').flush([]);
    const dialog = await loader.getHarness(MatDialogHarness);
    await (
      await loader.getHarness(MatInputHarness.with({ selector: '[formControlName="subject"]' }))
    ).setValue('auth0|alex');
    await (await loader.getHarness(MatButtonHarness.with({ text: 'Link account' }))).click();
    const request = http.expectOne('/api/identity/users/u1/auth0');
    await dialog.close();
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(1);
    expect(request.cancelled).toBe(false);
    request.flush({ detail: 'Cannot link account' }, { status: 409, statusText: 'Conflict' });
    await harness.fixture.whenStable();
    await dialog.close();
    await vi.waitFor(() => expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0));
  });

  it('memoizes the visible list until data or search changes', async () => {
    const component = await create();
    const rows = [
      {
        id: 'u1',
        email: 'alex@example.com',
        display_name: 'Alex',
        status: 'ACTIVE',
        auth0_subject: null,
        created_at: '',
        updated_at: '',
      },
    ] satisfies UserRecord[];
    component.store.replaceAll(rows);
    await changeQuery('alex');
    const first = component.visibleUsers();
    expect(component.visibleUsers()).toBe(first);
    await changeQuery('missing');
    expect(component.visibleUsers()).toEqual([]);
  });
});
