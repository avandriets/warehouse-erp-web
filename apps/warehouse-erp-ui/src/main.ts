import { bootstrapApplication } from '@angular/platform-browser';
import { loadAuthConfig } from '@warehouse/auth';

import { App } from './app/app';
import { createAppConfig } from './app/app.config';

loadAuthConfig()
  .then(config => bootstrapApplication(App, createAppConfig(config)))
  .catch(() => {
    document.body.textContent = 'Unable to load application configuration. Check config.json and reload the page.';
  });
