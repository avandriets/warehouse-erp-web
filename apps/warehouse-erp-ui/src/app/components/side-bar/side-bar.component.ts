import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';

interface ChatItem {
  id: string;
  title: string;
}

@Component({
  selector: 'erp-side-bar',
  imports: [MatIcon, MatMenu, MatMenuTrigger],
  templateUrl: './side-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideBarComponent {
  readonly collapsed = signal(false);

  readonly chats = signal<ChatItem[]>([
    { id: '1', title: 'Angular Material + Tailwind' },
    { id: '2', title: 'Warehouse ERP architecture' },
    { id: '3', title: 'Event-driven architecture' },
    { id: '4', title: 'Angular Signal Store' },
    { id: '5', title: 'Spanish practice' },
  ]);

  toggle(): void {
    this.collapsed.update(value => !value);
  }
}
