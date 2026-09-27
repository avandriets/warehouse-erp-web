import { TestBed } from '@angular/core/testing';

import { Page } from './page';

describe('Page', () => {
  it('can render content without the page header', async () => {
    const fixture = TestBed.createComponent(Page);

    fixture.componentRef.setInput('header', false);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('header')).toBeNull();
  });
});
