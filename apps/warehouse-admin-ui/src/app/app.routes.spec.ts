import { routes } from './app.routes';
import { ErrorPage } from './pages';

describe('admin application routes', () => {
  it('renders the not-found page for an unknown URL inside the application layout', async () => {
    const layoutRoute = routes.find(route => route.path === '');
    const notFoundRoute = layoutRoute?.children?.at(-1);

    expect(notFoundRoute?.path).toBe('**');
    expect(notFoundRoute?.data?.['status']).toBe(404);
    expect(await notFoundRoute?.loadComponent?.()).toBe(ErrorPage);
  });
});
