import type { WarehouseAuthConfig } from '@warehouse/auth';

export const environment = {
  auth: {
    apiUrl: '/api',
    domain: 'dev-oqmeiat8opcvxeul.us.auth0.com',
    clientId: 'BhEFM3qf6n2DKqwbz7uPtqt4l8UZIZv3',
    authorizationParams: {
      audience: 'https://api.warehouse-erp',
    },
  } satisfies WarehouseAuthConfig,
};
