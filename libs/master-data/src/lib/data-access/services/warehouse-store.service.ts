import { Injectable, signal } from '@angular/core';

import type { Warehouse, WarehouseDraft } from '../../types';

@Injectable()
export class WarehouseStoreService {
  private readonly records = signal<readonly Warehouse[]>([
    { id: '123', code: 'WH-001', name: 'Main warehouse', address: 'Madrid' },
    { id: '124', code: 'WH-002', name: 'Distribution warehouse', address: 'Barcelona' },
  ]);

  list(): readonly Warehouse[] {
    return this.records();
  }

  find(id: string): Warehouse | undefined {
    return this.list().find(record => record.id === id);
  }

  save(draft: WarehouseDraft, id?: string): void {
    const code = draft.code.trim();
    const name = draft.name.trim();
    if (!code || !name) {
      throw new Error('Code and name are required.');
    }
    if (id && !this.find(id)) {
      throw new Error('This record no longer exists.');
    }
    if (this.list().some(record => record.id !== id && record.code.toLowerCase() === code.toLowerCase())) {
      throw new Error('A record with this code already exists.');
    }
    const record: Warehouse = { id: id ?? crypto.randomUUID(), code, name, address: draft.address.trim() };
    this.records.update(records => (id ? records.map(item => (item.id === id ? record : item)) : [...records, record]));
  }

  remove(id: string): void {
    this.records.update(records => records.filter(record => record.id !== id));
  }
}
