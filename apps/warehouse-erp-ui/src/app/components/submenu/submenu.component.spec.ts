import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { SubmenuComponent } from './submenu.component';

describe('SubmenuComponent', () => {
  let fixture: ComponentFixture<SubmenuComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SubmenuComponent],
      providers: [provideRouter([{ path: '**', children: [] }])],
    });
    fixture = TestBed.createComponent(SubmenuComponent);
    fixture.componentRef.setInput('heading', 'External workspace');
    fixture.componentRef.setInput('groups', [
      {
        id: 'external',
        title: 'External group',
        items: [{ id: 'custom-item', route: '/custom/item', title: 'Custom item' }],
      },
    ]);
    fixture.componentRef.setInput('selectedId', null);
    await fixture.whenStable();
  });

  it('renders external groups and lets the parent control selection', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const item = root.querySelector<HTMLAnchorElement>('section a')!;

    expect(root.querySelector('header')?.textContent).toContain('External workspace');
    expect(root.querySelector('h3')?.textContent).toContain('External group');
    expect(item.textContent).toContain('Custom item');

    item.click();
    await fixture.whenStable();
    expect(item.getAttribute('href')).toBe('/custom/item');
    expect(TestBed.inject(Router).url).toBe('/custom/item');
    expect(item.classList.contains('bg-selected')).toBe(false);

    fixture.componentRef.setInput('selectedId', 'custom-item');
    await fixture.whenStable();
    expect(item.classList.contains('bg-selected')).toBe(true);
  });

  it('replaces the second-level content when inputs change', async () => {
    fixture.componentRef.setInput('heading', 'Empty workspace');
    fixture.componentRef.setInput('groups', []);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('header')?.textContent).toContain('Empty workspace');
    expect(root.querySelector('section')).toBeNull();
  });
});
