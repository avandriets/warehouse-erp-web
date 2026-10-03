import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import type { NavigationSection } from '../../types';
import { NavigationRailComponent } from './navigation-rail.component';

const sections: readonly NavigationSection[] = [
  { id: 'custom', route: '/custom', title: 'Custom section', icon: 'settings', sidebarTitle: 'Custom', groups: [] },
  { id: 'another', route: '/another', title: 'Another section', icon: 'folder', sidebarTitle: 'Another', groups: [] },
];

describe('NavigationRailComponent', () => {
  let fixture: ComponentFixture<NavigationRailComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [NavigationRailComponent] });
    fixture = TestBed.createComponent(NavigationRailComponent);
    fixture.componentRef.setInput('sections', sections);
    fixture.componentRef.setInput('activeSection', 'custom');
    fixture.componentRef.setInput('sidebarOpen', true);
    await fixture.whenStable();
  });

  it('renders supplied sections and emits their ids without changing external selection', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const selected = root.querySelector<HTMLButtonElement>('[aria-label="Custom section"]')!;
    const another = root.querySelector<HTMLButtonElement>('[aria-label="Another section"]')!;
    const onChange = vi.fn();
    fixture.componentInstance.sectionChange.subscribe(onChange);

    expect(selected.classList.contains('bg-selected')).toBe(true);
    expect(another.querySelector('mat-icon')?.textContent?.trim()).toBe('folder');
    expect(root.querySelectorAll('nav button')).toHaveLength(3);

    another.click();
    await fixture.whenStable();
    expect(onChange).toHaveBeenCalledWith('another');
    expect(selected.classList.contains('bg-selected')).toBe(true);

    fixture.componentRef.setInput('activeSection', 'another');
    await fixture.whenStable();
    expect(another.classList.contains('bg-selected')).toBe(true);
    expect(selected.classList.contains('bg-selected')).toBe(false);
  });

  it('updates navigation when the parent replaces configuration', async () => {
    fixture.componentRef.setInput('sections', [sections[1]]);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[aria-label="Custom section"]')).toBeNull();
    expect(root.querySelector('[aria-label="Another section"]')).not.toBeNull();

    fixture.componentRef.setInput('sections', []);
    await fixture.whenStable();
    expect(root.querySelectorAll('nav button')).toHaveLength(1);
  });
});
