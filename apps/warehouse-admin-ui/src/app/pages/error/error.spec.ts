import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { WarehouseAuthService } from '@warehouse/auth';

import { ErrorPage } from './error';

describe('error page', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'error', component: ErrorPage, data: { status: 503 } },
          { path: '**', component: ErrorPage, data: { status: 404 } },
        ]),
        { provide: WarehouseAuthService, useValue: { logout: vi.fn() } },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  it('renders a 404 at the originally requested URL', async () => {
    const page = await harness.navigateByUrl('/missing-page?status=401', ErrorPage);
    await harness.fixture.whenStable();

    expect(page.status()).toBe(404);
    expect(harness.fixture.nativeElement.textContent).toContain('Page not found');
  });

  it('renders the status supplied to the shared error route', async () => {
    const page = await harness.navigateByUrl('/error?status=403', ErrorPage);
    await harness.fixture.whenStable();

    expect(page.status()).toBe(403);
    expect(harness.fixture.nativeElement.textContent).toContain('Access unavailable');
  });
});
