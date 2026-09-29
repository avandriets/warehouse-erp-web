import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PageLayout } from './page-layout';

@Component({
  imports: [PageLayout],
  template: `
    <app-page-layout>
      <div pageFilters>Filters</div>
      <div pageBody>Body</div>
    </app-page-layout>
  `,
})
class PageLayoutHost {}

describe('PageLayout', () => {
  it('can render content without the page header', async () => {
    const fixture = TestBed.createComponent(PageLayout);

    fixture.componentRef.setInput('header', false);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('header')).toBeNull();
  });

  it('renders filters in the dedicated page area before the body', async () => {
    const fixture = TestBed.createComponent(PageLayoutHost);
    await fixture.whenStable();

    const filters = fixture.nativeElement.querySelector('.page-filters');
    const body = fixture.nativeElement.querySelector('[pageBody]');

    expect(filters.textContent).toContain('Filters');
    expect(filters.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
