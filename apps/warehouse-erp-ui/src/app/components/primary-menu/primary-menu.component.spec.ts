import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import type { ResolvedPrimaryMenuItem } from '../../types';
import { PrimaryMenuComponent } from './primary-menu.component';

const primaryMenu: readonly ResolvedPrimaryMenuItem[] = [
  { id: 'custom', route: '/custom', title: 'Custom section', icon: 'settings', sidebarTitle: 'Custom', groups: [] },
  { id: 'another', route: '/another', title: 'Another section', icon: 'folder', sidebarTitle: 'Another', groups: [] },
];

describe('PrimaryMenuComponent', () => {
  let fixture: ComponentFixture<PrimaryMenuComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [PrimaryMenuComponent] });
    fixture = TestBed.createComponent(PrimaryMenuComponent);
    fixture.componentRef.setInput('primaryMenu', primaryMenu);
    fixture.componentRef.setInput('activePrimaryMenuId', 'custom');
    fixture.componentRef.setInput('sidebarOpen', true);
    await fixture.whenStable();
  });

  it('renders supplied primaryMenu and emits their ids without changing external selection', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const selected = root.querySelector<HTMLButtonElement>('[aria-label="Custom section"]')!;
    const another = root.querySelector<HTMLButtonElement>('[aria-label="Another section"]')!;
    const onChange = vi.fn();
    fixture.componentInstance.primaryMenuChange.subscribe(onChange);

    expect(selected.classList.contains('bg-selected')).toBe(true);
    expect(another.querySelector('mat-icon')?.textContent?.trim()).toBe('folder');
    expect(root.querySelectorAll('nav button')).toHaveLength(3);

    another.click();
    await fixture.whenStable();
    expect(onChange).toHaveBeenCalledWith('another');
    expect(selected.classList.contains('bg-selected')).toBe(true);

    fixture.componentRef.setInput('activePrimaryMenuId', 'another');
    await fixture.whenStable();
    expect(another.classList.contains('bg-selected')).toBe(true);
    expect(selected.classList.contains('bg-selected')).toBe(false);
  });

  it('updates navigation when the parent replaces configuration', async () => {
    fixture.componentRef.setInput('primaryMenu', [primaryMenu[1]]);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[aria-label="Custom section"]')).toBeNull();
    expect(root.querySelector('[aria-label="Another section"]')).not.toBeNull();

    fixture.componentRef.setInput('primaryMenu', []);
    await fixture.whenStable();
    expect(root.querySelectorAll('nav button')).toHaveLength(1);
  });
});
