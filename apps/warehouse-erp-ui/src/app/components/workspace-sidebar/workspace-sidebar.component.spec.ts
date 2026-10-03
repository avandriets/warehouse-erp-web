import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { WorkspaceSidebarComponent } from './workspace-sidebar.component';

describe('WorkspaceSidebarComponent', () => {
  let fixture: ComponentFixture<WorkspaceSidebarComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [WorkspaceSidebarComponent] });
    fixture = TestBed.createComponent(WorkspaceSidebarComponent);
    fixture.componentRef.setInput('heading', 'External workspace');
    fixture.componentRef.setInput('groups', [
      { title: 'External group', items: [{ id: 'custom-item', route: '/custom/item', title: 'Custom item' }] },
    ]);
    fixture.componentRef.setInput('selectedId', null);
    await fixture.whenStable();
  });

  it('renders external groups and lets the parent control selection', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const item = root.querySelector<HTMLButtonElement>('section button')!;
    const onSelect = vi.fn();
    fixture.componentInstance.itemSelect.subscribe(onSelect);

    expect(root.querySelector('header')?.textContent).toContain('External workspace');
    expect(root.querySelector('h3')?.textContent).toContain('External group');
    expect(item.textContent).toContain('Custom item');

    item.click();
    await fixture.whenStable();
    expect(onSelect).toHaveBeenCalledWith('custom-item');
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
