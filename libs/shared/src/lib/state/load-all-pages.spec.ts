import { firstValueFrom, of } from 'rxjs';

import { loadAllPages } from './load-all-pages';

describe('loadAllPages', () => {
  it('loads every page, retaining archived items beyond the first hundred', async () => {
    const items = Array.from({ length: 205 }, (_, id) => ({ id, active: id !== 204 }));
    const fetch = vi.fn((offset: number, limit: number) =>
      of({ items: items.slice(offset, offset + limit), total: items.length }),
    );
    expect(await firstValueFrom(loadAllPages(fetch))).toEqual(items);
    expect(fetch.mock.calls).toEqual([
      [0, 100],
      [100, 100],
      [200, 100],
    ]);
  });
  it('fails rather than presenting an incomplete reference snapshot as complete', async () => {
    await expect(firstValueFrom(loadAllPages(() => of({ items: [1], total: 200 })))).rejects.toThrow('incomplete');
  });
  it('finishes an empty directory without repeated requests', async () => {
    const fetch = vi.fn(() => of({ items: [], total: 0 }));
    expect(await firstValueFrom(loadAllPages(fetch))).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
