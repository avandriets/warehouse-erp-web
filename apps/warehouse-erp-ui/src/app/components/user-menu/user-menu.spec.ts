import { OverlayContainer } from '@angular/cdk/overlay';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';

import { UserMenuComponent } from './user-menu';

describe('user menu', () => {
  it('opens account details and signs out only when the action is selected', async () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.componentRef.setInput('userName', 'Alex Example');
    fixture.componentRef.setInput('email', 'alex@example.test');
    const signOut = vi.fn();
    fixture.componentInstance.signOut.subscribe(signOut);
    await fixture.whenStable();
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatMenuHarness);
    expect(fixture.nativeElement.textContent).toContain('AE');
    await menu.open();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.textContent).toContain('Alex Example');
    expect(overlay.textContent).toContain('alex@example.test');
    expect(signOut).not.toHaveBeenCalled();
    const [item] = await menu.getItems({ text: /Sign out/ });
    await item.click();
    expect(signOut).toHaveBeenCalledOnce();
    expect(await menu.isOpen()).toBe(false);
  });

  it('can dismiss the menu without signing out and handles a missing name', async () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.componentRef.setInput('userName', '');
    const signOut = vi.fn();
    fixture.componentInstance.signOut.subscribe(signOut);
    await fixture.whenStable();
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatMenuHarness);
    expect(fixture.nativeElement.textContent).toContain('?');
    await menu.open();
    await menu.close();
    expect(await menu.isOpen()).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
  });
});
