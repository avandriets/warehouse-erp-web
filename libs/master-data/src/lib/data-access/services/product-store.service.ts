import { Injectable, signal } from '@angular/core';

import type { Product, ProductDraft } from '../../types';

@Injectable()
export class ProductStoreService {
  private readonly records = signal<readonly Product[]>([
    { id: '123', code: 'PRD-001', name: 'Packing box', description: 'Medium cardboard box' },
    { id: '124', code: 'PRD-002', name: 'Packing tape', description: 'Clear tape, 50 mm' },
  ]);

  list(): readonly Product[] {
    return this.records();
  }

  find(id: string): Product | undefined {
    return this.list().find(record => record.id === id);
  }

  save(draft: ProductDraft, id?: string): void {
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
    const record: Product = { id: id ?? crypto.randomUUID(), code, name, description: draft.description.trim() };
    this.records.update(records => (id ? records.map(item => (item.id === id ? record : item)) : [...records, record]));
  }

  remove(id: string): void {
    this.records.update(records => records.filter(record => record.id !== id));
  }
}
