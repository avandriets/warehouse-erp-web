import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AUTH_CONFIG } from '@warehouse/auth';

import { CurrencySelect } from './currency-select';

const eur = { id: 'eur', code: 'EUR', name: 'Euro', active: true };

describe('Accounting currency selector', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<CurrencySelect>;
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_CONFIG, useValue: { apiUrl: '/api' } },
      ],
    });
    fixture = TestBed.createComponent(CurrencySelect);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
    vi.useRealTimers();
  });

  it('resolves the saved currency by id without changing the parent value', async () => {
    const page = fixture.componentInstance;
    const changed = vi.fn();
    page.registerOnChange(changed);
    page.writeValue('eur');
    http.expectOne('/api/reference-data/currencies/eur').flush(eur);
    fixture.detectChanges();
    await vi.runAllTimersAsync();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input').value).toBe('EUR — Euro');
    expect(changed).not.toHaveBeenCalled();
    page.setDisabledState(true);
    expect(page.value.disabled).toBe(true);
  });

  it('searches active currencies with a bounded request and requires a result selection', () => {
    const page = fixture.componentInstance;
    const changed = vi.fn();
    page.registerOnChange(changed);
    page.value.setValue('e');
    vi.advanceTimersByTime(100);
    page.value.setValue('eur');
    vi.advanceTimersByTime(250);
    const request = http.expectOne(req => req.url === '/api/reference-data/currencies');
    expect(request.request.params.get('q')).toBe('eur');
    expect(request.request.params.get('active')).toBe('true');
    expect(request.request.params.get('limit')).toBe('25');
    request.flush({ items: [eur], total: 30 });
    expect(page.validate()).toEqual({ currencySelection: true });
    expect(changed).not.toHaveBeenCalled();
    page.value.setValue(eur);
    expect(page.validate()).toBeNull();
    expect(changed).toHaveBeenLastCalledWith('eur');
    page.clear();
    expect(changed).toHaveBeenLastCalledWith(null);
  });

  it('shows lookup failures and retries the saved selection without clearing it', () => {
    const page = fixture.componentInstance;
    const changed = vi.fn();
    page.registerOnChange(changed);
    page.writeValue('eur');
    http.expectOne('/api/reference-data/currencies/eur').error(new ProgressEvent('error'));
    expect(page.error()).toContain('server is unavailable');
    expect(changed).not.toHaveBeenCalled();
    page.retry();
    http.expectOne('/api/reference-data/currencies/eur').flush(eur);
    vi.advanceTimersByTime(250);
    http.expectOne(req => req.url === '/api/reference-data/currencies').flush({ items: [eur], total: 1 });
    expect(page.error()).toBe('');
    expect(page.value.value).toEqual(eur);
  });

  it('does not overwrite typed input when an old selected-currency request completes', () => {
    const page = fixture.componentInstance;
    page.writeValue('eur');
    const request = http.expectOne('/api/reference-data/currencies/eur');
    page.value.setValue('usd');
    expect(request.cancelled).toBe(true);
    vi.advanceTimersByTime(250);
    http.expectOne(req => req.url === '/api/reference-data/currencies').flush({ items: [], total: 0 });
    expect(page.value.value).toBe('usd');
    expect(page.validate()).toEqual({ currencySelection: true });
  });
});
